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
var targetFPS = 27.5;

//-------------------------------------------------------
// Scene Manipulator Functions & Variables
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
fpsLog.fill(targetFPS);

function average(input)
{
	var average = 0.0;
	for(var i = 0; i < input.length; i++) {
		average += input[i];
	}
	average /= input.length;
	return average;
}

function clamp(input, min, max)
{
	return Math.max(Math.min(input, max), min);
}

var m_stepDamping = 0.75;
var m_stepAccum = 0;
var calcMaxSteps = function(lastFPS, lastMaxSteps)
{
	if(!lastFPS)
		return lastMaxSteps;

	fpsLog.shift();
	fpsLog.push(lastFPS);
	var averageFPS = average(fpsLog);

	// We don't want the adjustment to happen too quickly (changing maxSteps every frame is quick!),
	// so we'll let fractional amounts m_stepAccumulate until they reach an integer value.
	var newVal = Math.pow((averageFPS / targetFPS), (1 / 20)) * lastMaxSteps;
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

//-------------------------------------------------------
// Sets up the scene
//-------------------------------------------------------
var init = function(){
  //Setup our THREE scene--------------------------------
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
  gens = createGenerators(hCWH);
  invGens = invGenerators(gens);
  currentBoost = new THREE.Matrix4(); // boost for camera relative to central cell
  cellBoost = new THREE.Matrix4(); // boost for the cell that we are in relative to where we started
  invCellBoost = new THREE.Matrix4();
  lightSourcePosition = new THREE.Vector4(0.0,0.0,0.9801960588,1.400280084); // position on hyperboloid of light source, is lorentzNormalize(0,0,.7,1)
  //We need to load the shaders from file
  //since web is async we need to wait on this to finish
  loadShaders();
}

var loadShaders = function(){ //Since our shader is made up of strings we can construct it from parts
  var loader = new THREE.FileLoader();
  loader.setResponseType('text')
  loader.load('shaders/fragment.glsl',function(main){
    loader.load('shaders/hyperbolicLighting.glsl',function(lighting){
      loader.load('shaders/hyperbolicScene.glsl', function(scene){
        loader.load('shaders/hyperbolicMath.glsl', function(math){
          loader.load('shaders/globalsInclude.glsl', function(globals){
            //pass full shader string to finish our init
            finishInit(globals.concat(math).concat(scene).concat(lighting).concat(main));
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
      lightingModel:{type: "i", value:1},
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
      lightSourcePosition:{type:"v4", value:lightSourcePosition},
      maxSteps:{type:"i", value:maxSteps},
      sceneIndex:{type:"i", value: 1},
      halfCubeWidthKlein:{type:"f", value: hCWK},
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
