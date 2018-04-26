var scene;
var renderer;
var effect;
var camera;
var virtCamera;
var mesh;
var geom;
var material;
var controls;
var currentBoost;
var leftCurrentBoost;
var rightCurrentBoost;
var maxSteps = 50;
var leftEyeRotation;
var rightEyeRotation;
var currentBoost;
var leftCurrentBoost;
var rightCurrentBoost;
var targetFPS = {value:27.5};
var textFPS;
var time;

//-------------------------------------------------------
// FPS Manager
//-------------------------------------------------------

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
fpsLog.fill(targetFPS.value);

function average(input)
{
	var average = 0.0;
	for(var i = 0; i < input.length; i++) {
		average += input[i];
	}
	average /= input.length;
	return average;
}

var m_stepDamping = 0.75;
var m_stepAccum = 0;
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
	 var newVal = Math.pow((averageFPS / targetFPS.value), (1 / 20)) * lastMaxSteps;
	 var diff = newVal - lastMaxSteps;
	 if(Math.abs( m_stepAccum ) < 1)
	 {
		  m_stepAccum += diff;
		  m_stepAccum *= m_stepDamping;
		  //console.log(m_stepAccum);
		  return lastMaxSteps;
	 }

	 newVal = lastMaxSteps + m_stepAccum;
	 newVal = Math.round(clamp(newVal, 31, 127));
	 //console.log("updating maxSteps to " + newVal);
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

var initValues = function(){
	var invHCWK = 1.0/hCWK;
	hCDP.push(lorentzNormalizeTHREE(new THREE.Vector4(invHCWK,0.0,0.0,1.0)));
	hCDP.push(lorentzNormalizeTHREE(new THREE.Vector4(0.0,invHCWK,0.0,1.0)));
	hCDP.push(lorentzNormalizeTHREE(new THREE.Vector4(0.0,0.0,invHCWK,1.0)));
	gens = createGenerators();
	invGens = invGenerators(gens);
}

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


//-------------------------------------------------------
// Sets up the lights
//-------------------------------------------------------
var lightPositions = [];
var lightIntensities = [];
var initLights = function(){
	lightPositions.push(new THREE.Vector4(0.0,0.0,0.9801960588,1.400280084));
	lightIntensities.push(new THREE.Vector3(0.0,1.0,1.0).multiplyScalar(0.4));
	lightPositions.push(new THREE.Vector4(0.0,0.0,-0.9801960588, 1.400280084));
	lightIntensities.push(new THREE.Vector3(1.0,0.647,0.0).multiplyScalar(0.8));
	for(var i = 1; i<7; i++){
		lightPositions.push(new THREE.Vector4(0,0,0,1));
		lightIntensities.push(new THREE.Vector3(0,0,0));
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
  effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  camera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow(2,53),1);
  virtCamera = new THREE.PerspectiveCamera(60,1,0.1,1);
  virtCamera.position.z = 0.1;
  cameraOffset = new THREE.Vector3();
  controls = new THREE.VRControls(virtCamera);
  currentBoost = new THREE.Matrix4(); // boost for camera relative to central cell
  cellBoost = new THREE.Matrix4(); // boost for the cell that we are in relative to where we started
  invCellBoost = new THREE.Matrix4();
	initValues();
	initLights();
	//We need to load the shaders from file
  //since web is async we need to wait on this to finish
  loadShaders();
}

var globalsFrag;
var mathFrag;
var mainFrag;
var scenesFrag = [];

var loadShaders = function(){ //Since our shader is made up of strings we can construct it from parts
  var loader = new THREE.FileLoader();
  loader.setResponseType('text');
  loader.load('shaders/fragment.glsl',function(main){
    loader.load('shaders/simplexCuts.glsl', function(scene){
      loader.load('shaders/hyperbolicMath.glsl', function(math){
        loader.load('shaders/globalsInclude.glsl', function(globals){
          //pass full shader string to finish our init
          globalsFrag = globals;
          mathFrag = math;
          mainFrag = main;
          scenesFrag.push(scene);
          finishInit(globals.concat(math).concat(scene).concat(main));
          loader.load('shaders/edgeTubes.glsl', function(tubes){
            loader.load('shaders/medialSurfaces.glsl', function(medial){
              loader.load('shaders/cubeSides.glsl', function(cubes){
                scenesFrag.push(tubes);
                scenesFrag.push(medial);
                scenesFrag.push(cubes);
              });
            });
          });
        });
      });
    });
  });
  
}

var finishInit = function(fShader){
//  console.log(fShader);
  material = new THREE.ShaderMaterial({
    uniforms:{
      isStereo:{type: "i", value: 0},
      cameraProjection:{type:"m4", value:new THREE.Matrix4()},
      screenResolution:{type:"v2", value:new THREE.Vector2(window.innerWidth, window.innerHeight)},
      cameraPos:{type:"v3", value:virtCamera.position},
      cameraQuat:{type:"v4", value:virtCamera.quaternion},
      fov:{type:"f", value:virtCamera.fov},
      generators:{type:"m4v", value:gens},
      invGenerators:{type:"m4v", value:invGens},
      currentBoost:{type:"m4", value:currentBoost},
      leftCurrentBoost:{type:"m4", value:leftCurrentBoost},
      rightCurrentBoost:{type:"m4",value:rightCurrentBoost},
      leftEyeRotation:{type:"v4", value:leftEyeRotation},
      rightEyeRotation:{type:"v4", value:rightEyeRotation},
      cellBoost:{type:"m4", value:cellBoost},
      invCellBoost:{type:"m4", value:invCellBoost},
      maxSteps:{type:"i", value:maxSteps},
			lightPositions:{type:"v4v", value:lightPositions},
			lightIntensities:{type:"v3v", value:lightIntensities},
			halfCubeDualPoints:{type:"v4v", value:hCDP},
      halfCubeWidthKlein:{type:"f", value: hCWK},
	  	cut4:{type:"i", value:cut4},
      sphereRad:{type:"f", value:sphereRad},
      tubeRad:{type:"f", value:tubeRad},
      horosphereSize:{type:"f", value:horosphereSize},
      planeOffset:{type:"f", value:planeOffset}
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: fShader,
    transparent:true
  });
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
  mesh = new THREE.Mesh(geom, material);
  scene.add(mesh);
  animate();
}

//-------------------------------------------------------
// Where our scene actually renders out to screen
//-------------------------------------------------------
var animate = function(){
  controls.update();
	//lightPositions[0] = constructHyperboloidPoint(new THREE.Vector3(0,0,1), 0.5 + 0.3*Math.sin((Date.now()-time)/1000));
  maxSteps = calcMaxSteps(fps.getFPS(), maxSteps);
  material.uniforms.maxSteps.value = maxSteps;
  effect.render(scene, camera, animate);
}

//-------------------------------------------------------
// Where the magic happens
//-------------------------------------------------------
init();

//-------------------------------------------------------
// Event listeners
//-------------------------------------------------------
var onResize = function(){
  effect.setSize(window.innerWidth, window.innerHeight);
  if(material != null){
    material.uniforms.screenResolution.value.x = window.innerWidth;
    material.uniforms.screenResolution.value.y = window.innerHeight;
  }
}
window.addEventListener('resize', onResize, false);
