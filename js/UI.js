//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_cut4 = 2;
var g_sphereRad = 0.996216;
var g_tubeRad = 0.15;
var g_horospherSize = -0.951621;
var g_planeOffset = 0.75;
var g_targetFPS = {value:27.5};

//-------------------------------------------------------
// UI Variables
//-------------------------------------------------------

var guiInfo = { //Since dat gui can only modify object values we store variables here.
  sceneIndex: 0,
  toggleUI: true,
  edgeCase:2,
  edgeThickness:1.5,
  eToHScale:1.0,
  fov:90,
  toggleStereo:false,
  rotateEyes:false,
  autoSteps:true,
  maxSteps: 31,
  halfIpDistance: 0.03200000151991844,
  falloffModel: 1
};

function updateEyes(){
  g_effect.leftEyeTranslation.x = guiInfo.eToHScale * guiInfo.halfIpDistance;
  g_effect.rightEyeTranslation.x = guiInfo.eToHScale * -guiInfo.halfIpDistance;

  g_leftCurrentBoost = translateByVector(g_geometry,g_effect.leftEyeTranslation);
  g_rightCurrentBoost = translateByVector(g_geometry,g_effect.rightEyeTranslation);
  g_effect.getEyeRotation(g_effect.leftEyeTranslation.x);
  g_material.uniforms.leftEyeRotation.value = g_leftEyeRotation;
  g_material.uniforms.rightEyeRotation.value = g_rightEyeRotation;
  g_material.uniforms.leftCurrentBoost.value = g_leftCurrentBoost;
  g_material.uniforms.rightCurrentBoost.value = g_rightCurrentBoost;
}

function getGeometryFrag()
{
	geometryFragIdx = 0;
	if( g_geometry == Geometry.Euclidean )
		geometryFragIdx = 1;
	if( g_geometry == Geometry.Spherical )
		geometryFragIdx = 2;
	return geometryFrag[geometryFragIdx];
}

// Inputs are from the UI parameterizations.
// gI is the guiInfo object from initGui
function updateUniformsFromUI()
{
	// Get the number of cubes around each edge.
	var r = 6;
	switch (guiInfo.edgeCase) {
		case '0': r = 4; break;
		case '1': r = 5; break;
		case '2': r = 6; break;
		case '3': r = 7; break;
		case '4': r = 8; break;
		case '5': r = 9; break;
		case '6': r = 10; break;
		case '7': r = 11; break;
		case '8': r = 12; break;
		default: break;
	}

	var p = 4, q = 3;
	var g = GetGeometry( p, q, r );

	// Check to see if the geometry has changed.
	// If so, update the shader.
	if( g !== g_geometry )
	{
		g_geometry = g;
		var geoFrag = getGeometryFrag();
    g_material.needsUpdate = true;
    g_material.uniforms.geometry.value = g;
		g_material.fragmentShader = globalsFrag.concat(geoFrag).concat(scenesFrag[guiInfo.sceneIndex]).concat(mainFrag);
    g_currentBoost.identity();
	}

	// Calculate the hyperbolic width of the cube, and the width in the Klein model.
	var inrad = InRadius(p, q, r);
	var midrad = MidRadius(p, q, r);
	hCWH = hCWK = inrad;
	if( g == Geometry.Hyperbolic )
		hCWK = poincareToKlein(hyperbolicToPoincare(inrad));

	// Calculate sphereRad, horosphereSize, and planeOffset
	//
	// Picture the truncated honeycomb cells filled with "spheres", made
	// big enough so that they become tangent at cell faces.
	// We want them to be slightly bigger than that so that they intersect.
	// hOffset controls the thickness of edges at their smallest neck.
	// (zero is a reasonable value, and good for testing.)
	g_cut4 = GetGeometry2D( q, r );
	var hOffset = guiInfo.edgeThickness / 10;

	//Tube Radius
	g_tubeRad = guiInfo.edgeThickness/10;

	// sphereRad
	g_sphereRad = midrad - hOffset;

	// horosphereSize
	var midEdgeDir = new THREE.Vector3(Math.cos(Math.PI / 4), Math.cos(Math.PI / 4), 1);
	var midEdge = constructHyperboloidPoint(midEdgeDir, g_sphereRad);
	var distToMidEdge = horosphereHSDF(midEdge, idealCubeCornerKlein, -g_sphereRad);
	g_horospherSize = -(g_sphereRad - distToMidEdge);

	// planeOffset
	var dualPoint = lorentzNormalizeTHREE(new THREE.Vector4(hCWK, hCWK, hCWK, 1.0));
	var distToMidEdge = geodesicPlaneHSDF(midEdge, dualPoint, 0);
	g_planeOffset = distToMidEdge;

	initValues(g);
	g_material.uniforms.invGenerators.value = invGens;
	g_material.uniforms.halfCubeDualPoints.value = hCDP;
	g_material.uniforms.halfCubeWidthKlein.value = hCWK;
	g_material.uniforms.cut4.value = g_cut4;
	g_material.uniforms.sphereRad.value = g_sphereRad;
	g_material.uniforms.tubeRad.value = g_tubeRad;
	g_material.uniforms.horosphereSize.value = g_horospherSize;
	g_material.uniforms.planeOffset.value = g_planeOffset;
	g_material.uniforms.attnModel.value = guiInfo.falloffModel;
}

//What we need to init our dat GUI
var initGui = function(){
  var gui = new dat.GUI();
  gui.close();
  //scene settings ---------------------------------
  var sceneController = gui.add(guiInfo, 'sceneIndex',{Simplex_cuts: 0, Edge_tubes: 1, Medial_surface: 2, Cube_planes: 3}).name("Scene");
  var edgeController = gui.add(guiInfo, 'edgeCase', {"4":0, "5":1, "6":2, "7":3, "8":4, "9":5, "10":6, "11":7, "12":8}).name("Edge Degree");
  var thicknessController = gui.add(guiInfo, 'edgeThickness', 0, 5).name("Edge Thickness");
  var scaleController = gui.add(guiInfo, 'eToHScale', 0.25,4).name("Euclid To Hyp");
  var fovController = gui.add(guiInfo, 'fov',40,180).name("FOV");
  var lightFalloffController = gui.add(guiInfo, 'falloffModel', {InverseLinear: 1, InverseSquare:2, InverseCube:3, Physical: 4, None:5}).name("Light Falloff");
  //debug settings ---------------------------------
  var debugFolder = gui.addFolder('Debug');
  var stereoFolder = debugFolder.addFolder('Stereo');
  var debugUIController = debugFolder.add(guiInfo, 'toggleUI').name("Toggle Debug UI");
  debugFolder.add(guiInfo, 'autoSteps').name("Auto Adjust Step Count");
  debugFolder.add(guiInfo, 'maxSteps', 0, 127).name("Set Step Count");
  debugFolder.add(g_targetFPS, 'value', 15, 90).name("Target FPS");
  var switchToStereo = stereoFolder.add(guiInfo, 'toggleStereo').name("Toggle Stereo");
  var rotateController = stereoFolder.add(guiInfo, 'rotateEyes').name("Rotate Eyes");
  var pupilDistanceController = stereoFolder.add(guiInfo, 'halfIpDistance').name("Interpupiliary Distance");

  // ------------------------------
  // UI Controllers
  // ------------------------------
  lightFalloffController.onFinishChange(function(value){
    updateUniformsFromUI();
  })

  edgeController.onFinishChange(function(value) {
	  updateUniformsFromUI();
  });

  thicknessController.onChange(function(value) {
	  updateUniformsFromUI();
  });

  scaleController.onFinishChange(function(value) {
    updateEyes();
  });

  fovController.onChange(function(value){
    g_virtCamera.fov = value;
    g_material.uniforms.fov.value = value;
  });

  debugUIController.onFinishChange(function(value){
    var crosshair = document.getElementById("crosshair");
    var crosshairLeft = document.getElementById("crosshairLeft");
    var crosshairRight = document.getElementById("crosshairRight");
    var fps = document.getElementById("fps");
    var about = document.getElementById("about");
    if(value){
      about.style.visibility = 'visible';
      fps.style.visibility = 'visible';
      if(guiInfo.toggleStereo){
        crosshairLeft.style.visibility = 'visible';
        crosshairRight.style.visibility = 'visible';
      }
      else
        crosshair.style.visibility = 'visible';
    }
    else{
      about.style.visibility = 'hidden';
      fps.style.visibility = 'hidden';
      crosshair.style.visibility = 'hidden';
      crosshairLeft.style.visibility = 'hidden';
      crosshairRight.style.visibility = 'hidden';
    }
  });

  switchToStereo.onFinishChange(function(value){
    var crosshair = document.getElementById("crosshair");
    var crosshairLeft = document.getElementById("crosshairLeft");
    var crosshairRight = document.getElementById("crosshairRight");
    if(guiInfo.toggleUI){
      if(value){
        crosshairLeft.style.visibility = 'visible';
        crosshairRight.style.visibility = 'visible';
        crosshair.style.visibility = 'hidden';
      }
      else{
        crosshairLeft.style.visibility = 'hidden';
        crosshairRight.style.visibility = 'hidden';
        crosshair.style.visibility = 'visible';
      }
    }
  });

  pupilDistanceController.onFinishChange(function(value){
    updateEyes();
  });

  rotateController.onFinishChange(function(value) {
    updateEyes();
  });

  sceneController.onFinishChange(function(index){
	  var geoFrag = getGeometryFrag();
    g_material.needsUpdate = true;
    g_material.fragmentShader = globalsFrag.concat(geoFrag).concat(scenesFrag[index]).concat(mainFrag);
  });
}