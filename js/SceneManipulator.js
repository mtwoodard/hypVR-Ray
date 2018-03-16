var gens;
var invGens;
var hCWH = 0.6584789485;
var hCWK = 0.5773502692;
var sphereRad = 1.0;
var horosphereSize = 2.6;

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

//What we need to init our dat GUI
var initGui = function(){
  var guiInfo = { //Since dat gui can only modify object values we store variables here.
    edgeCase:2
  };
  var gui = new dat.GUI();
  gui.add(material.uniforms.sceneIndex, 'value',{Sphere_horosphere: 1, Sphere_plane: 2, Medial_surface: 3, Cube_planes: 4}).name("Scene");
  var edgeController = gui.add(guiInfo, 'edgeCase', {"1-5":1, "2-6":2, "3-7":3, "4-8":4, "5-9":5, "6-10":6, "7-11":7, "8-12":8}).name("Edge Case");
  edgeController.onFinishChange(function(value){
    //console.log(value);

	// Get the number of cubes around each edge.
	var r = 6;
	switch(value)
	{
	case '1': r = 5; break;
	case '2': r = 6; break;
	case '3': r = 7; break;
	case '4': r = 8; break;
	case '5': r = 9; break;
	case '6': r = 10; break;
	case '7': r = 11; break;
	case '8': r == 12; break;
	default: break;	
	}	

	// Calculate the hyperbolic width of the cube, and the width in the Klein model.
	var p = 4, q = 3;
	var inrad = inRadius( p, q, r );
	hCWH = inrad;
	hCWK = poincareToKlein( h2pNorm( inrad ) );

	// TODO! Calculate sphereRad, horosphereSize, and planeOffset

	gens = createGenerators();
	invGens = invGenerators(gens);
	material.uniforms.generators.value = gens;
	material.uniforms.invGenerators.value = invGens;
	material.uniforms.halfCubeWidthKlein.value = hCWK;
	material.uniforms.sphereRad.value = sphereRad;
	material.uniforms.horosphereSize.value = horosphereSize;	
  });
}
