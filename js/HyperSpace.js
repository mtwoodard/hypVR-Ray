//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_effect;
var g_virtCamera;
var g_material;
var g_controls;
var g_geometry;
var g_rotation;
var g_currentBoost;
var g_leftCurrentBoost;
var g_rightCurrentBoost;
var g_screenResolution;
var g_controllerBoosts = [];

//-------------------------------------------------------
// Scene Variables
//-------------------------------------------------------
var scene;
var renderer;
var camera;
var mesh;
var geom;
var maxSteps = 50;
var textFPS;
var time;

//-------------------------------------------------------
// FPS Manager
//-------------------------------------------------------
var m_stepDamping = 0.75;
var m_stepAccum = 0;

var fps = {
	lastTime: null,
	getFPS: function () {
		if(!this.lastTime) {
			this.lastTime = new Date();
			return null;
		}
		var date = new Date();
		var currentFps = 1000 / (date - this.lastTime);
		this.lastTime = date;
		return currentFps;
	}
}
var fpsLog = new Array(10);
fpsLog.fill(g_targetFPS.value);

function average(input)
{
	var average = 0.0;
	for(var i = 0; i < input.length; i++) {
		average += input[i];
	}
	average /= input.length;
	return average;
}

var calcMaxSteps = function(lastFPS, lastMaxSteps)
{
  if(guiInfo.autoSteps){
	   if(!lastFPS)
		  return lastMaxSteps;

	 fpsLog.shift();
	 fpsLog.push(lastFPS);
	 var averageFPS = average(fpsLog);
	 textFPS.innerHTML = averageFPS.toPrecision(3);

	 // We don't want the adjustment to happen too quickly (changing maxSteps every frame is quick!),
	 // so we'll let fractional amounts m_stepAccumulate until they reach an integer value.
	 var newVal = Math.pow((averageFPS / g_targetFPS.value), (1 / 20)) * lastMaxSteps;
	 var diff = newVal - lastMaxSteps;
	 if(Math.abs( m_stepAccum ) < 1)
	 {
		  m_stepAccum += diff;
		  m_stepAccum *= m_stepDamping;
		  return lastMaxSteps;
	 }

	 newVal = lastMaxSteps + m_stepAccum;
	 newVal = Math.round(Math.clamp(newVal, 31, 127));
	 m_stepAccum = 0;
	 return newVal;
  }
  else {
    return guiInfo.maxSteps;
  }
}

//-------------------------------------------------------
// Sets up precalculated values
//-------------------------------------------------------
var hCWH = 0.6584789485;
var hCWK = 0.5773502692;
var gens;
var invGens;
var hCDP = [];

var initValues = function(g){
	g_geometry = g;
	var invHCWK = 1.0/hCWK;
	hCDP[0] = new THREE.Vector4(invHCWK,0.0,0.0,1.0).geometryNormalize(g_geometry);
	hCDP[1] = new THREE.Vector4(0.0,invHCWK,0.0,1.0).geometryNormalize(g_geometry);
	hCDP[2] = new THREE.Vector4(0.0,0.0,invHCWK,1.0).geometryNormalize(g_geometry);
	gens = createGenerators(g);
	invGens = invGenerators(gens);
}

var createGenerators = function(g){
  var gen0 = translateByVector(g, new THREE.Vector3(2.0*hCWH,0.0,0.0));
  var gen1 = translateByVector(g, new THREE.Vector3(-2.0*hCWH,0.0,0.0));
  var gen2 = translateByVector(g, new THREE.Vector3(0.0,2.0*hCWH,0.0));
  var gen3 = translateByVector(g, new THREE.Vector3(0.0,-2.0*hCWH,0.0));
  var gen4 = translateByVector(g, new THREE.Vector3(0.0,0.0,2.0*hCWH));
  var gen5 = translateByVector(g, new THREE.Vector3(0.0,0.0,-2.0*hCWH));
  return [gen0, gen1, gen2, gen3, gen4, gen5];
}

var invGenerators = function(genArr){
  return [genArr[1],genArr[0],genArr[3],genArr[2],genArr[5],genArr[4]];
}


//-------------------------------------------------------
// Sets up the lights
//-------------------------------------------------------
var lightPositions = [];
var lightIntensities = [];
var attnModel = 1;
var initLights = function(){
  lightPositions.push(constructHyperboloidPoint(new THREE.Vector3(0,0,1), 1.0));
  lightIntensities.push(new THREE.Vector4(0.0,0.0,1.0,1.0));
  lightPositions.push(constructHyperboloidPoint(new THREE.Vector3(1,0,0), 1.2));
  lightIntensities.push(new THREE.Vector4(1.0,0.0,0.0,1.0));
  lightPositions.push(constructHyperboloidPoint(new THREE.Vector3(0,1,0), 1.1));
  lightIntensities.push(new THREE.Vector4(0.0,1.0,0.0,1.0));
  lightPositions.push(constructHyperboloidPoint(new THREE.Vector3(-1,-1,-1), 1.0));
	lightIntensities.push(new THREE.Vector4(1.0,1.0,1.0,1.0));
	for(var i = 3; i<8; i++){
		lightPositions.push(new THREE.Vector4(0,0,0,1));
		lightIntensities.push(new THREE.Vector4(0,0,0,0));
	}
}

//-------------------------------------------------------
// Sets up global objects
//-------------------------------------------------------
var globalObjectBoosts = [];
var invGlobalObjectBoosts = [];
var globalObjectRadii = [];
var globalObjectTypes = [];
var initObjects = function(g){
  var objMat = new THREE.Matrix4().multiply(translateByVector(g,new THREE.Vector3(-0.5,0,0)));
  globalObjectBoosts.push(objMat);
  invGlobalObjectBoosts.push(new THREE.Matrix4().getInverse(objMat));
  globalObjectRadii.push(new THREE.Vector3(0.2,0.2,0.2));
  globalObjectTypes.push(0);
  for(var i = 1; i<8; i++){
    globalObjectBoosts.push(new THREE.Matrix4());
    invGlobalObjectBoosts.push(new THREE.Matrix4());
    globalObjectRadii.push(new THREE.Vector3(0,0,0));
    globalObjectTypes.push(-1); // -1 stands for not an object so we dont waste time coloring on the glsl side
  }
}
//-------------------------------------------------------
// Sets up the scene
//-------------------------------------------------------
var init = function(){
  //Setup our THREE scene--------------------------------
	time = Date.now();
	textFPS = document.getElementById('fps');
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  document.body.appendChild(renderer.domElement);
  g_screenResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
  g_effect = new THREE.VREffect(renderer);
  camera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow(2,53),1);
  g_virtCamera = new THREE.PerspectiveCamera(90,1,0.1,1);
  g_virtCamera.position.z = 0.1;
  cameraOffset = new THREE.Vector3();
  g_controls = new THREE.VRControls();
  g_rotation = new THREE.Quaternion();
  g_controllerBoosts.push(new THREE.Matrix4());
  g_controllerBoosts.push(new THREE.Matrix4());
  g_currentBoost = new THREE.Matrix4(); // boost for camera relative to central cell
  cellBoost = new THREE.Matrix4(); // boost for the cell that we are in relative to where we started
  invCellBoost = new THREE.Matrix4();
  g_geometry = Geometry.Hyperbolic; // we start off hyperbolic
	initValues(g_geometry);
  initLights();
  initObjects(g_geometry);
	//We need to load the shaders from file
  //since web is async we need to wait on this to finish
  loadShaders();
}

var globalsFrag;
var geometryFrag = [];
var mainFrag;
var scenesFrag = [];

var loadShaders = function(){ //Since our shader is made up of strings we can construct it from parts
  var loader = new THREE.FileLoader();
  loader.setResponseType('text');
  loader.load('shaders/fragment.glsl',function(main){
    loader.load('shaders/simplexCuts.glsl', function(scene){
      loader.load('shaders/hyperbolic.glsl', function(hyperbolic){
        loader.load('shaders/globalsInclude.glsl', function(globals){
          //pass full shader string to finish our init
          globalsFrag = globals;
          geometryFrag.push(hyperbolic);
          scenesFrag.push(scene);
          mainFrag = main;
          finishInit(globals.concat(hyperbolic).concat(scene).concat(main));
          loader.load('shaders/edgeTubes.glsl', function(tubes){
            loader.load('shaders/medialSurfaces.glsl', function(medial){
              loader.load('shaders/cubeSides.glsl', function(cubes){
                scenesFrag.push(tubes);
                scenesFrag.push(medial);
                scenesFrag.push(cubes);
              });
            });
          });
          loader.load('shaders/euclidean.glsl', function(euclidean){
            loader.load('shaders/spherical.glsl', function(spherical){
              geometryFrag.push(euclidean);
              geometryFrag.push(spherical);
            });
          });
        });
      });
    });
  });
  
}

var finishInit = function(fShader){
//  console.log(fShader);
  g_material = new THREE.ShaderMaterial({
    uniforms:{
      isStereo:{type: "i", value: 0},
      geometry:{type: "i", value: 3},
      screenResolution:{type:"v2", value:g_screenResolution},
      fov:{type:"f", value:g_virtCamera.fov},
      invGenerators:{type:"m4v", value:invGens},
      currentBoost:{type:"m4", value:g_currentBoost},
      leftCurrentBoost:{type:"m4", value:g_leftCurrentBoost},
      rightCurrentBoost:{type:"m4",value:g_rightCurrentBoost},
      cellBoost:{type:"m4", value:cellBoost},
      invCellBoost:{type:"m4", value:invCellBoost},
      maxSteps:{type:"i", value:maxSteps},
			lightPositions:{type:"v4v", value:lightPositions},
      lightIntensities:{type:"v3v", value:lightIntensities},
      attnModel:{type:"i", value:attnModel},
      texture:{type:"t", value: new THREE.TextureLoader().load("images/concrete.jpg")},
      controllerCount:{type:"i", value: 0},
      controllerBoosts:{type:"m4", value:g_controllerBoosts},
      globalObjectBoosts:{type:"m4v", value:globalObjectBoosts},
      invGlobalObjectBoosts:{type:"m4v", value:invGlobalObjectBoosts},
      globalObjectRadii:{type:"v3v", value:globalObjectRadii},
      globalObjectTypes:{type:"iv1", value: globalObjectTypes},
			halfCubeDualPoints:{type:"v4v", value:hCDP},
      halfCubeWidthKlein:{type:"f", value: hCWK},
	  	cut4:{type:"i", value:g_cut4},
      sphereRad:{type:"f", value:g_sphereRad},
      tubeRad:{type:"f", value:g_tubeRad},
      horosphereSize:{type:"f", value:g_horospherSize},
      planeOffset:{type:"f", value:g_planeOffset}
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: fShader,
    transparent:true
  });
  g_effect.setSize(g_screenResolution.x, g_screenResolution.y);
  //Setup dat GUI --- SceneManipulator.js
  initGui();
  //Setup a "quad" to render on-------------------------
  geom = new THREE.BufferGeometry();
  var vertices = new Float32Array([
    -1.0, -1.0, 0.0,
     1.0, -1.0, 0.0,
     1.0,  1.0, 0.0,

    -1.0, -1.0, 0.0,
     1.0,  1.0, 0.0,
    -1.0,  1.0, 0.0
  ]);
  geom.addAttribute('position',new THREE.BufferAttribute(vertices,3));
  mesh = new THREE.Mesh(geom, g_material);
  scene.add(mesh);
  animate();
}

//-------------------------------------------------------
// Where our scene actually renders out to screen
//-------------------------------------------------------
var animate = function(){
  g_controls.update();
	//lightPositions[0] = constructHyperboloidPoint(new THREE.Vector3(0,0,1), 0.5 + 0.3*Math.sin((Date.now()-time)/1000));
  maxSteps = calcMaxSteps(fps.getFPS(), maxSteps);
  THREE.VRController.update();
  g_material.uniforms.maxSteps.value = maxSteps;
 // console.log(THREE.VRController.controllers.length);
  g_material.uniforms.controllerCount.value = THREE.VRController.controllers.length;
  g_material.uniforms.controllerBoosts.value = g_controllerBoosts;
  g_effect.render(scene, camera, animate);
}

//-------------------------------------------------------
// Where the magic happens
//-------------------------------------------------------
init();