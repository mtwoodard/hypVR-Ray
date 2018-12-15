//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_cut1 = 1;
var g_cut4 = 2;
var g_tubeRad = 0.15;
var g_cellPosition = new THREE.Vector4(0, 0, 0, 1);
var g_cellSurfaceOffset = 0.996216;
var g_vertexPosition = idealCubeCornerKlein;
var g_vertexSurfaceOffset = -0.951621;
var g_targetFPS = {value:27.5};

//-------------------------------------------------------
// UI Variables
//-------------------------------------------------------

var guiInfo;

function updateEyes(){
  g_effect.leftEyeTranslation.x = guiInfo.eToHScale * guiInfo.halfIpDistance;
  g_effect.rightEyeTranslation.x = guiInfo.eToHScale * -guiInfo.halfIpDistance;

  g_leftCurrentBoost = translateByVector(g_geometry,g_effect.leftEyeTranslation);
  g_rightCurrentBoost = translateByVector(g_geometry,g_effect.rightEyeTranslation);
  g_effect.getEyeRotation(g_effect.leftEyeTranslation.x);
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
  var p = Number(guiInfo.p);
  var q = Number(guiInfo.q);
	var r = Number(guiInfo.r);
  var g = GetGeometry( p, q, r );
  var isCubical = p == 4 && q == 3;

  // Check to see if the geometry has changed.
  // If so, update the shader.
  if( g !== g_geometry )
  {
    g_geometry = g;
    var geoFrag = getGeometryFrag();
    g_material.needsUpdate = true;
    g_material.fragmentShader = globalsFrag.concat(geoFrag).concat(scenesFrag[guiInfo.sceneIndex]).concat(mainFrag);
    guiInfo.resetPosition();
  }

	// Calculate the hyperbolic width of the cube, and the width in the Klein model.
	var inrad = InRadius(p, q, r);
	var midrad = MidRadius(p, q, r);
	hCWH = hCWK = inrad;
	if( g == Geometry.Spherical )
	{
		var stereo = Math.sphericalToStereographic(inrad);
		hCWK = Math.stereographicToGnomonic( stereo );
	}
	if( g == Geometry.Hyperbolic )
		hCWK = Math.poincareToKlein(Math.hyperbolicToPoincare(inrad));

	// Tube Radius
	g_tubeRad = guiInfo.edgeThickness/10;

	// Calculate cellSurfaceOffset and vertexSurfaceOffset
	//
	// Picture the truncated honeycomb cells filled with "spheres", made
	// big enough so that they become tangent at cell faces.
	// We want them to be slightly bigger than that so that they intersect.
	// hOffset controls the thickness of edges at their smallest neck.
	// (zero is a reasonable value, and good for testing.)
  g_cut1 = GetGeometry2D( p, q );
  g_cut4 = GetGeometry2D( q, r );
	var hOffset = guiInfo.edgeThickness / 10;

  // cellSurfaceOffset
  switch( g_cut1 )
  {
  case Geometry.Spherical:
    g_cellPosition = new THREE.Vector4(0,0,0,1);
    g_cellSurfaceOffset = midrad - hOffset;
    break;

  case Geometry.Euclidean:
    g_cellPosition = new THREE.Vector4(0,0,1,1);  // North pole of Klein model.
    g_cellSurfaceOffset = (Math.poincareToHyperbolic( Math.kleinToPoincare(0.95) ) - hOffset);
    break;

  case Geometry.Hyperbolic:
    let facetsKlein = SimplexFacetsKlein( p, q, r );
    g_cellPosition = new THREE.Vector4(0,0,1,0);  // Just the direction.
    g_cellSurfaceOffset = (Math.poincareToHyperbolic( Math.kleinToPoincare(0.95) ) - hOffset);
    break;
  }

  // Calculate a point we need for the vertex sphere calc.
  var midEdgeDir = new THREE.Vector3(Math.cos(Math.PI / 4), Math.cos(Math.PI / 4), 1);
  var midEdge = constructPointInGeometry( g_geometry, midEdgeDir, g_cellSurfaceOffset );

  // Vertex location and sphere size.
  g_vertexPosition = new THREE.Vector4( hCWK, hCWK, hCWK, 1.0 ); 
  if( g_geometry != Geometry.Euclidean )
    g_vertexPosition.geometryNormalize( g_geometry );

  switch( g_cut4 )
  {
  case Geometry.Spherical:
    var distToMidEdge = midEdge.geometryDistance(g_geometry, g_vertexPosition);
    g_vertexSurfaceOffset = distToMidEdge;
    break;

  case Geometry.Euclidean:
    var distToMidEdge = horosphereHSDF(midEdge, idealCubeCornerKlein, -g_cellSurfaceOffset);
    g_vertexPosition = idealCubeCornerKlein;
    g_vertexSurfaceOffset = -(g_cellSurfaceOffset - distToMidEdge);
    break;

  case Geometry.Hyperbolic:
    g_vertexSurfaceOffset = geodesicPlaneHSDF(midEdge, g_vertexPosition, 0);
    break;
  }
  
  if( isCubical ) {
    g_targetFPS.value = 27.5;
    maxSteps = 31;
  }
  else {
    g_vertexSurfaceOffset = 0;
    g_cut4 = -1;

    // Simplex drawing is more expensive, so let's live with a lower frame rate.
    g_targetFPS.value = 17.0;
    maxSteps = 55;
  }

  // Higher than this value for hyperbolic we run into floating point errors
  var maxDist = 10.0;
  if( g_geometry == Geometry.Euclidean )
    maxDist = 50.0; // Needs to be larger for euclidean.
  if( g_geometry == Geometry.Spherical )
    maxDist = Math.PI; // Only go to antipode.

  initGenerators(p,q,r);
  initLights(g_geometry);
  g_material.uniforms.lightPositions.value = lightPositions;
  g_material.uniforms.lightIntensities.value = lightIntensities;
  initObjects(g_geometry);
  g_material.uniforms.globalObjectBoosts.value = globalObjectBoosts;
  g_material.uniforms.invGlobalObjectBoosts.value = invGlobalObjectBoosts;
  g_material.uniforms.globalObjectRadii.value = globalObjectRadii;
  g_material.uniforms.globalObjectTypes.value = globalObjectTypes;
  
  g_material.uniforms.geometry.value = g;
  g_material.uniforms.invGenerators.value = invGens;
  g_material.uniforms.halfCubeDualPoints.value = hCDP;
  g_material.uniforms.halfCubeWidthKlein.value = hCWK;
  g_material.uniforms.cut1.value = g_cut1;
  g_material.uniforms.cut4.value = g_cut4;
  g_material.uniforms.tubeRad.value = g_tubeRad;
  g_material.uniforms.cellPosition.value = g_cellPosition;
  g_material.uniforms.cellSurfaceOffset.value = g_cellSurfaceOffset;
  g_material.uniforms.vertexPosition.value = g_vertexPosition;
  g_material.uniforms.vertexSurfaceOffset.value = g_vertexSurfaceOffset;
  g_material.uniforms.attnModel.value = guiInfo.falloffModel;
  g_material.uniforms.maxDist.value = maxDist;

  g_material.uniforms.useSimplex.value = !isCubical;
  g_material.uniforms.simplexMirrorsKlein.value = simplexMirrors;
}

//What we need to init our dat GUI
var initGui = function(){
  guiInfo = { //Since dat gui can only modify object values we store variables here.
    sceneIndex: 0,
    toggleUI: true,
    p:4,
    q:3,
    r:6,
    edgeThickness:1.5,
    eToHScale:1.0,
    fov:90,
    toggleStereo:false,
    rotateEyes:false,
    autoSteps:true,
    maxSteps: 31,
    halfIpDistance: 0.03200000151991844,
    falloffModel: 1,
    screenshotWidth: g_screenShotResolution.x,
    screenshotHeight: g_screenShotResolution.y,
    resetPosition: function(){
      g_currentBoost.identity();
      g_cellBoost.identity();
      g_invCellBoost.identity();
      g_controllerBoosts[0].identity();
    },
    TakeSS: function(){
      takeScreenshot();
    }
  };

  var gui = new dat.GUI();
  gui.close();
  //scene settings ---------------------------------
  var sceneController = gui.add(guiInfo, 'sceneIndex',{Simplex_cuts: 0, Edge_tubes: 1, Medial_surface: 2, Cube_planes: 3}).name("Scene");
  var pController = gui.add(guiInfo, 'p', {"3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "11":11, "12":12, "30":30}).name("P");
  var qController = gui.add(guiInfo, 'q', {"3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "11":11, "12":12, "30":30}).name("Q");
  var rController = gui.add(guiInfo, 'r', {"3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "11":11, "12":12, "30":30}).name("R");
  var thicknessController = gui.add(guiInfo, 'edgeThickness', 0, 5).name("Edge Thickness");
  var scaleController = gui.add(guiInfo, 'eToHScale', 0.25,4).name("Euclid To Hyp");
  var fovController = gui.add(guiInfo, 'fov',40,180).name("FOV");
  var lightFalloffController = gui.add(guiInfo, 'falloffModel', {InverseLinear: 1, InverseSquare:2, InverseCube:3, Physical: 4, None:5}).name("Light Falloff");
  gui.add(guiInfo, 'resetPosition').name("Reset Position");
  var screenshotFolder = gui.addFolder('Screenshot');
  var widthController = screenshotFolder.add(guiInfo, 'screenshotWidth');
  var heightController = screenshotFolder.add(guiInfo, 'screenshotHeight');
  screenshotFolder.add(guiInfo, 'TakeSS').name("Take Screenshot");
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
  widthController.onFinishChange(function(value){
    g_screenShotResolution.x = value;
  });

  heightController.onFinishChange(function(value){
    g_screenShotResolution.y = value;
  })

  lightFalloffController.onFinishChange(function(value){
    updateUniformsFromUI();
  });

  pController.onFinishChange(function(value) {
	  updateUniformsFromUI();
  });

  qController.onFinishChange(function(value) {
	  updateUniformsFromUI();
  });

  rController.onFinishChange(function(value) {
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