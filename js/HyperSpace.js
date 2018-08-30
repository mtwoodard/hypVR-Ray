//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_effect;
var g_fov;
var g_material;
var g_controls;
var g_rotation;
var g_currentBoost;
var g_leftCurrentBoost;
var g_rightCurrentBoost;
var g_cellBoost;
var g_invCellBoost;
var g_screenResolution;

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
var fpsLog = new Array(10);
fpsLog.fill(30);

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

var calcMaxSteps = function(lastFPS, lastMaxSteps)
{
	  if(!lastFPS)
		  return lastMaxSteps;

	  fpsLog.shift();
	  fpsLog.push(lastFPS);
	  var averageFPS = Math.average(fpsLog);

	  // We don't want the adjustment to happen too quickly (changing maxSteps every frame is quick!),
	  // so we'll let fractional amounts m_stepAccumulate until they reach an integer value.
	  var newVal = Math.pow((averageFPS /30), (1 / 20)) * lastMaxSteps;
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

//-------------------------------------------------------
// Sets up precalculated values
//-------------------------------------------------------
var hCWH = 0.6584789485;
var gens;
var invGens;

var initValues = function(){
	gens = createGenerators();
  invGens = invGenerators(gens);
}

var createGenerators = function(){
  var gen0 = translateByVector(new THREE.Vector3(2.0*hCWH,0.0,0.0));
  var gen1 = translateByVector(new THREE.Vector3(-2.0*hCWH,0.0,0.0));
  var gen2 = translateByVector(new THREE.Vector3(0.0,2.0*hCWH,0.0));
  var gen3 = translateByVector(new THREE.Vector3(0.0,-2.0*hCWH,0.0));
  var gen4 = translateByVector(new THREE.Vector3(0.0,0.0,2.0*hCWH));
  var gen5 = translateByVector(new THREE.Vector3(0.0,0.0,-2.0*hCWH));
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
  PointLightObject(new THREE.Vector3(1.2,0,0), new THREE.Vector4(1,0,0,1));
  PointLightObject(new THREE.Vector3(0,1.2,0), new THREE.Vector4(0,1,0,1));
  PointLightObject(new THREE.Vector3(0,0,1.2), new THREE.Vector4(0,0,1,1));
  PointLightObject(new THREE.Vector3(-1,-1,-1), new THREE.Vector4(1,1,1,1));
}

//-------------------------------------------------------
// Sets up global objects
//-------------------------------------------------------
var globalObjectBoost;

var initObjects = function(){
  globalObjectBoost = new THREE.Matrix4().multiply(translateByVector(new THREE.Vector3(-0.5,0,0)));
}

//-------------------------------------------------------
// Sets up the scene
//-------------------------------------------------------
var init = function(){
  //Setup our THREE scene--------------------------------
	time = Date.now();
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  document.body.appendChild(renderer.domElement);
  g_screenResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
  g_effect = new THREE.VREffect(renderer);
  camera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow(2,53),1);
  g_controls = new THREE.Controls();
  g_rotation = new THREE.Quaternion();
  g_currentBoost = new THREE.Matrix4(); // boost for camera relative to central cell
  g_cellBoost = new THREE.Matrix4(); // boost for the cell that we are in relative to where we started
  g_invCellBoost = new THREE.Matrix4();
	initValues();
  initLights();
  initObjects();
	//We need to load the shaders from file
  //since web is async we need to wait on this to finish
  loadShaders();
}

var loadShaders = function(){ //Since our shader is made up of strings we can construct it from parts
  var loader = new THREE.FileLoader();
  loader.setResponseType('text');
  loader.load('shaders/fragment.glsl',function(main){
    //pass full shader string to finish our init
    finishInit(main);
  });
}

var finishInit = function(fShader){
  g_material = new THREE.ShaderMaterial({
    uniforms:{
      isStereo:{type: "i", value: 0},
      screenResolution:{type:"v2", value:g_screenResolution},
      invGenerators:{type:"m4v", value:invGens},
      currentBoost:{type:"m4", value:g_currentBoost},
      leftCurrentBoost:{type:"m4", value:g_leftCurrentBoost},
      rightCurrentBoost:{type:"m4",value:g_rightCurrentBoost},
      cellBoost:{type:"m4", value:g_cellBoost},
      invCellBoost:{type:"m4", value:g_invCellBoost},
      maxSteps:{type:"i", value:maxSteps},
			lightPositions:{type:"v4v", value:lightPositions},
      lightIntensities:{type:"v3v", value:lightIntensities},
      globalObjectBoosts:{type:"m4", value:globalObjectBoost}    
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: fShader,
    transparent:true
  });
  g_effect.setSize(g_screenResolution.x, g_screenResolution.y);
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
  maxSteps = calcMaxSteps(fps.getFPS(), maxSteps);
  g_material.uniforms.maxSteps.value = maxSteps;
  g_effect.render(scene, camera, animate);
}

//-------------------------------------------------------
// Where the magic happens
//-------------------------------------------------------
init();