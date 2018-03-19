var gens;
var invGens;
var hCWH = 0.6584789485;
var hCWK = 0.5773502692;
var sphereRad = 1.0;
var horosphereSize = 2.6;
var planeOffset = 0.75;

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
  var edgeController = gui.add(guiInfo, 'edgeCase', {"5":1, "6":2, "7":3, "8":4, "9":5, "10":6, "11":7, "12":8}).name("Edge degree");
  edgeController.onFinishChange(function(value){
    //console.log(value);

	// Get the number of cubes around each edge.
	var r = 6;
	switch(value)
	{
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
	var inrad = inRadius( p, q, r );
	hCWH = inrad;
	hCWK = poincareToKlein( hyperbolicToPoincare( inrad ) );

	// Calculate sphereRad, horosphereSize, and planeOffset
	//
	// Picture the truncated honeycomb cells filled with "spheres", made
	// big enough so that they become tangent at cell faces.
	// We want them to be slightly bigger than that so that they intersect.
	// This needs to be improved with some more thought. Maybe we should try 
	// to use the geometry to calculate a standard circle intersection size.
	var hOffset = 0.25;
	sphereRad = inrad + hOffset;
	if (r == 6)
		sphereRad = 1.0;
	horosphereSize = 2.6;
	planeOffset = hOffset * 3 * ( 30 / ( Math.pow( r, 1.75 ) ) );

	gens = createGenerators();
	invGens = invGenerators(gens);
	material.uniforms.generators.value = gens;
	material.uniforms.invGenerators.value = invGens;
	material.uniforms.halfCubeWidthKlein.value = hCWK;
	material.uniforms.sphereRad.value = sphereRad;
	material.uniforms.horosphereSize.value = horosphereSize;
	material.uniforms.planeOffset.value = planeOffset;
  });
}
