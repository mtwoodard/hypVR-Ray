var gens;
var invGens;
var hCWH = 0.6584789485;
var hCWK = 0.5773502692;
var cut4 = 2;
var sphereRad = 0.996216;
var tubeRad = 0.15;
var horosphereSize = -0.951621;
var planeOffset = 0.75;

var guiInfo = { //Since dat gui can only modify object values we store variables here.
  edgeCase:2,
  edgeThickness:1.5,
  lightingModel:1,
  eToHScale:1.0,
  toggleStereo:false,
  rotateEyes:false,
  autoSteps:true,
  maxSteps: 31,
  halfIpDistance: 0.03200000151991844
};

var createGenerators = function(){
  var gen0 = translateByVector(new THREE.Vector3( 2.0*hCWH, 0.0, 0.0));
  var gen1 = translateByVector(new THREE.Vector3(-2.0*hCWH, 0.0, 0.0));
  var gen2 = translateByVector(new THREE.Vector3(0.0,  2.0*hCWH, 0.0));
  var gen3 = translateByVector(new THREE.Vector3(0.0, -2.0*hCWH, 0.0));
  var gen4 = translateByVector(new THREE.Vector3(0.0, 0.0,  2.0*hCWH));
  var gen5 = translateByVector(new THREE.Vector3(0.0, 0.0, -2.0*hCWH));
  return [gen0, gen1, gen2, gen3, gen4, gen5];
}

var invGenerators = function(genArr){
  return [genArr[1],genArr[0],genArr[3],genArr[2],genArr[5],genArr[4]];
}

function updateEyes(){
  effect.leftEyeTranslation.x = guiInfo.eToHScale * guiInfo.halfIpDistance;
  effect.rightEyeTranslation.x = guiInfo.eToHScale * -guiInfo.halfIpDistance;

  leftCurrentBoost = translateByVector(effect.leftEyeTranslation);
  rightCurrentBoost = translateByVector(effect.rightEyeTranslation);
  effect.getEyeRotation(effect.leftEyeTranslation);
  material.uniforms.leftEyeRotation.value = leftEyeRotation;
  material.uniforms.rightEyeRotation.value = rightEyeRotation;
  material.uniforms.leftCurrentBoost.value = leftCurrentBoost;
  material.uniforms.rightCurrentBoost.value = rightCurrentBoost;
}

// Inputs are from the UI parameterizations.
// gI is the guiInfo object from initGui
function updateUniformsFromUI()
{
	// Get the number of cubes around each edge.
	var r = 6;
	switch (guiInfo.edgeCase) {
		case '0': r = 3; break;
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

	// Calculate the hyperbolic width of the cube, and the width in the Klein model.
	var p = 4, q = 3;
	var inrad = InRadius(p, q, r);
	var midrad = MidRadius(p, q, r);
	hCWH = inrad;
	hCWK = poincareToKlein(hyperbolicToPoincare(inrad));

	// Calculate sphereRad, horosphereSize, and planeOffset
	//
	// Picture the truncated honeycomb cells filled with "spheres", made
	// big enough so that they become tangent at cell faces.
	// We want them to be slightly bigger than that so that they intersect.
	// hOffset controls the thickness of edges at their smallest neck.
	// (zero is a reasonable value, and good for testing.)
	var cut4 = GetGeometry2D( q, r );
	var hOffset = guiInfo.edgeThickness / 10;

	//Tube Radius
	tubeRad = guiInfo.edgeThickness/10;

	// sphereRad
	sphereRad = midrad - hOffset;

	// horosphereSize
	var midEdgeDir = new THREE.Vector3(Math.cos(Math.PI / 4), Math.cos(Math.PI / 4), 1);
	var midEdge = constructHyperboloidPoint(midEdgeDir, sphereRad);
	var distToMidEdge = horosphereHSDF(midEdge, idealCubeCornerKlein, -sphereRad);
	horosphereSize = -(sphereRad - distToMidEdge);

	// planeOffset
	var dualPoint = lorentzNormalizeTHREE(new THREE.Vector4(hCWK, hCWK, hCWK, 1.0));
	var distToMidEdge = geodesicPlaneHSDF(midEdge, dualPoint, 0);
	planeOffset = distToMidEdge;

	gens = createGenerators();
	invGens = invGenerators(gens);
	material.uniforms.generators.value = gens;
	material.uniforms.invGenerators.value = invGens;
	material.uniforms.halfCubeWidthKlein.value = hCWK;
	material.uniforms.cut4.value = cut4;
	material.uniforms.sphereRad.value = sphereRad;
	material.uniforms.tubeRad.value = tubeRad;
	material.uniforms.horosphereSize.value = horosphereSize;
	material.uniforms.planeOffset.value = planeOffset;
	material.uniforms.lightingModel.value = guiInfo.lightingModel;
}

//What we need to init our dat GUI
var initGui = function(){
  var gui = new dat.GUI();
  gui.add(material.uniforms.sceneIndex, 'value',{Simplex_cuts: 1, Edge_tubes: 3, Medial_surface: 4, Cube_planes: 5}).name("Scene");
  var lightingController = gui.add(guiInfo, 'lightingModel', {"Standard":0, "Foo": 1}).name("Lighting Model");
  var edgeController = gui.add(guiInfo, 'edgeCase', {"5":1, "6":2, "7":3, "8":4, "9":5, "10":6, "11":7, "12":8}).name("Edge Degree");
  var thicknessController = gui.add(guiInfo, 'edgeThickness', 0, 5).name("Edge Thickness");
  var scaleController = gui.add(guiInfo, 'eToHScale', 0.25,4).name("Euclid To Hyp");
  var debugFolder = gui.addFolder('Debug');
  var pupilDistanceController = debugFolder.add(guiInfo, 'halfIpDistance').name("Interpupiliary Distance");
  debugFolder.add(guiInfo, 'toggleStereo').name("Toggle Stereo");
  var rotateController = debugFolder.add(guiInfo, 'rotateEyes').name("Rotate Eyes");
  debugFolder.add(guiInfo, 'autoSteps').name("Auto Adjust Step Count");
  debugFolder.add(guiInfo, 'maxSteps', 0, 127).name("Set Step Count");

  edgeController.onFinishChange(function(value) {
	  updateUniformsFromUI();
  });

  thicknessController.onFinishChange(function(value) {
	  updateUniformsFromUI();
  });

  lightingController.onFinishChange(function(value){
    updateUniformsFromUI();
  });

  scaleController.onFinishChange(function(value) {
    updateEyes();
  });

  pupilDistanceController.onFinishChange(function(value){
    updateEyes();
  });

  rotateController.onFinishChange(function(value) {
    effect.getEyeRotation(effect.leftEyeTranslation.x);
    material.uniforms.leftEyeRotation.value = leftEyeRotation;
    material.uniforms.rightEyeRotation.value = rightEyeRotation;
    updateUniformsFromUI();
  });
}
