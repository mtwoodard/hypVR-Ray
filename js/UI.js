//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_sphereRad = 0.996216;
var g_tubeRad = 0.15;
var g_horospherSize = -0.951621;
var g_planeOffset = 0.75;

//-------------------------------------------------------
// UI Variables
//-------------------------------------------------------

var guiInfo = { //Since dat gui can only modify object values we store variables here.
  sceneIndex: 0,
  toggleUI: true,
  edgeCase:6,
  edgeThickness:1.5,
  eToHScale:1.0,
  fov:90,
  falloffModel: 1,
  resetPosition: function(){
    g_currentBoost.identity();
    g_cellBoost.identity();
    g_invCellBoost.identity();
  }
};

function updateEyes(){
  g_effect.leftEyeTranslation.x = guiInfo.eToHScale * guiInfo.halfIpDistance;
  g_effect.rightEyeTranslation.x = guiInfo.eToHScale * -guiInfo.halfIpDistance;

  g_leftCurrentBoost = translateByVector(g_geometry,g_effect.leftEyeTranslation);
  g_rightCurrentBoost = translateByVector(g_geometry,g_effect.rightEyeTranslation);
  g_material.uniforms.leftCurrentBoost.value = g_leftCurrentBoost;
  g_material.uniforms.rightCurrentBoost.value = g_rightCurrentBoost;
}

// Inputs are from the UI parameterizations.
// gI is the guiInfo object from initGui
function updateUniformsFromUI()
{
	// Get the number of cubes around each edge.
	var r = guiInfo.edgeCase;
	var p = 4, q = 3;
	var g = GetGeometry( p, q, r );

	// Check to see if the geometry has changed.
	// If so, update the shader.
	if( g !== g_geometry )
	{
		g_geometry = g;
    g_material.needsUpdate = true;
    g_material.fragmentShader = globalsFrag.concat(hyperbolic).concat(scenesFrag[guiInfo.sceneIndex]).concat(mainFrag);
    guiInfo.resetPosition();
	}

	// Calculate the hyperbolic width of the cube, and the width in the Klein model.
	var inrad = InRadius(p, q, r);
	var midrad = MidRadius(p, q, r);
	hCWH = hCWK = inrad;
	hCWK = Math.poincareToKlein(Math.hyperbolicToPoincare(inrad));

	// Calculate sphereRad, horosphereSize, and planeOffset
	//
	// Picture the truncated honeycomb cells filled with "spheres", made
	// big enough so that they become tangent at cell faces.
	// We want them to be slightly bigger than that so that they intersect.
	// hOffset controls the thickness of edges at their smallest neck.
	// (zero is a reasonable value, and good for testing.)
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
	var dualPoint = new THREE.Vector4(hCWK, hCWK, hCWK, 1.0).geometryNormalize(g_geometry);
	var distToMidEdge = geodesicPlaneHSDF(midEdge, dualPoint, 0);
	g_planeOffset = distToMidEdge;

  initValues(g_geometry);
  g_material.uniforms.geometry.value = g;
	g_material.uniforms.invGenerators.value = invGens;
	g_material.uniforms.halfCubeDualPoints.value = hCDP;
  g_material.uniforms.halfCubeWidthKlein.value = hCWK;
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
  var sceneController = gui.add(guiInfo, 'sceneIndex',{Simplex_cuts: 0, Edge_tubes: 1, Medial_surface: 2}).name("Scene");
  var edgeController = gui.add(guiInfo, 'edgeCase', {"3":3, "4":4, "5":5, "6":6, "7":7, "8":8, "9":9, "10":10, "11":11, "12":12}).name("Edge Degree");
  var thicknessController = gui.add(guiInfo, 'edgeThickness', 0, 5).name("Edge Thickness");
  var scaleController = gui.add(guiInfo, 'eToHScale', 0.25,4).name("Euclid To Hyp");
  var fovController = gui.add(guiInfo, 'fov',40,180).name("FOV");
  var lightFalloffController = gui.add(guiInfo, 'falloffModel', {InverseLinear: 1, InverseSquare:2, InverseCube:3, Physical: 4, None:5}).name("Light Falloff");
  gui.add(guiInfo, 'resetPosition').name("Reset Position");

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
    g_fov = value;
    g_material.uniforms.fov.value = value;
  });

  sceneController.onFinishChange(function(index){
	  var geoFrag = getGeometryFrag();
    g_material.needsUpdate = true;
    g_material.fragmentShader = globalsFrag.concat(geoFrag).concat(scenesFrag[index]).concat(mainFrag);
  });
}