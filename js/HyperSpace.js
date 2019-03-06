//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_effect;
var g_mat_global;
var g_mat_local;
var g_controls;
var g_geometry;
var g_rotation;
var g_currentBoost;
var g_stereoBoosts = [];
var g_cellBoost;
var g_invCellBoost;
var g_screenResolution;
var g_screenShotResolution;
var g_controllerBoosts = [];
var g_controllerDualPoints = [];

//-------------------------------------------------------
// Scene Variables
//-------------------------------------------------------
var local_scene;
var global_scene;
var comp_scene;
var renderer;
var camera;
var maxSteps = 50;
var maxDist = 10.0;
var textFPS;
var time;

//-------------------------------------------------------
// FPS Manager
//-------------------------------------------------------
var m_stepDamping = 0.75;
var m_stepAccum = 0;
var fpsLog = new Array(10);
fpsLog.fill(g_targetFPS.value);

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
  if(guiInfo.autoSteps){
	  if(!lastFPS)
		  return lastMaxSteps;

	  fpsLog.shift();
	  fpsLog.push(lastFPS);
	  var averageFPS = Math.average(fpsLog);
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
var simplexMirrors = [];
var simplexDualPoints = [];

var initGenerators = function( p, q, r ){
  g_geometry = GetGeometry( p, q, r );
  var isCubical = p == 4 && q == 3;

  if( isCubical )
  {
    var invHCWK = 1.0/hCWK;
    
    hCDP[0] = new THREE.Vector4(invHCWK,0.0,0.0,1.0);
    hCDP[1] = new THREE.Vector4(0.0,invHCWK,0.0,1.0);
    hCDP[2] = new THREE.Vector4(0.0,0.0,invHCWK,1.0);
    if( g_geometry != Geometry.Euclidean ) {
      for( var i=0; i<3; i++ )
        hCDP[i].geometryNormalize(g_geometry);
    }

    gens = createCubeGenerators(g_geometry);
    invGens = invCubeGenerators(gens);

    simplexMirrors = [];
    simplexDualPoints = [];
    for(var i = 0; i<4; i++){
      simplexMirrors.push(new THREE.Vector4());
      simplexDualPoints.push(new THREE.Vector4());
    }
  }
  else
  {
    simplexMirrors = SimplexFacetsKlein( p, q, r );
    simplexDualPoints = [];
    for(var i = 0; i<4; i++){
      simplexDualPoints.push( PlaneDualPoint( g_geometry, simplexMirrors[i]) );
    }

    invGens = SimplexInverseGenerators( g_geometry, simplexMirrors );

    // invGens needs to be length-6;
    for(var i = 0; i<2; i++){
      invGens.push(translateByVector(g_geometry, new THREE.Vector3(0.0,0.0,0.0)));
    }

    gens = invGens;
  }

  for(var i = 0; i<6; i++){
    g_controllerDualPoints.push(new THREE.Vector4());
  }
}

var createCubeGenerators = function(g){
  var gen0 = translateByVector(g, new THREE.Vector3(2.0*hCWH,0.0,0.0));
  var gen1 = translateByVector(g, new THREE.Vector3(-2.0*hCWH,0.0,0.0));
  var gen2 = translateByVector(g, new THREE.Vector3(0.0,2.0*hCWH,0.0));
  var gen3 = translateByVector(g, new THREE.Vector3(0.0,-2.0*hCWH,0.0));
  var gen4 = translateByVector(g, new THREE.Vector3(0.0,0.0,2.0*hCWH));
  var gen5 = translateByVector(g, new THREE.Vector3(0.0,0.0,-2.0*hCWH));
  return [gen0, gen1, gen2, gen3, gen4, gen5];
}

var invCubeGenerators = function(genArr){
  return [genArr[1],genArr[0],genArr[3],genArr[2],genArr[5],genArr[4]];
}


//-------------------------------------------------------
// Sets up the lights
//-------------------------------------------------------
var lightPositions = [];
var lightIntensities = [];
var attnModel = 1;

var initLights = function(g){
  lightPositions = [];
  lightIntensities = [];
  PointLightObject(g, new THREE.Vector3(0,0,1), new THREE.Vector4(0,0,1,2));
  PointLightObject(g, new THREE.Vector3(1.2,0,0), new THREE.Vector4(1,0,0,2));
  PointLightObject(g, new THREE.Vector3(0,1.1,0), new THREE.Vector4(0,1,0,2));
  PointLightObject(g, new THREE.Vector3(0,-1.1,0), new THREE.Vector4(1,1,1,1));
  //Add light info for controllers
  lightIntensities.push(new THREE.Vector4(0.49, 0.28, 1.0, 2));
  lightIntensities.push(new THREE.Vector4(1.0, 0.404, 0.19, 2));
}

//-------------------------------------------------------
// Sets up global objects
//-------------------------------------------------------
var globalObjectBoost;
var globalObjectRadius;

//TODO: CREATE GLOBAL OBJECT CONSTRUCTORS
var initObjects = function(g){
  SphereObject(g, new THREE.Vector3(-0.5,0,0), 0.2); // geometry, position, radius
}

//-------------------------------------------------------
// Sets up the scene
//-------------------------------------------------------
var init = function(){
  if(WEBGL.isWebGL2Available() === false){
    document.body.appendChild(WEBGL.getWebGL2ErrorMessage());
  }
  else{
    //Setup our THREE scene--------------------------------
	  time = Date.now();
	  textFPS = document.getElementById('fps');
    local_scene = new THREE.Scene();
    global_scene = new THREE.Scene();
    comp_scene = new THREE.Scene();
    var canvas  = document.createElement('canvas');
    var context = canvas.getContext('webgl2');
    renderer = new THREE.WebGLRenderer({canvas: canvas, context: context});
    renderer.autoClear =false;
    document.body.appendChild(renderer.domElement);
    g_screenResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    g_screenShotResolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    g_effect = new THREE.VREffect(renderer);
    camera = new THREE.OrthographicCamera(-1,1,1,-1,1/Math.pow(2,53),1);
    g_controls = new THREE.Controls();
    g_rotation = new THREE.Quaternion();
    g_controllerBoosts.push(new THREE.Matrix4());
    g_controllerBoosts.push(new THREE.Matrix4());
    g_currentBoost = new THREE.Matrix4(); // boost for camera relative to central cell
    g_cellBoost = new THREE.Matrix4(); // boost for the cell that we are in relative to where we started
    g_invCellBoost = new THREE.Matrix4();
    g_geometry = Geometry.Hyperbolic; // we start off hyperbolic
	  initGenerators(4,3,6);
    initLights(g_geometry);
    initObjects(g_geometry);
	  //We need to load the shaders from file
    //since web is async we need to wait on this to finish
    loadShaders();
  }
}

var gPass;
var lPass;
var cPass;

var loadShaders = function(){ //Since our shader is made up of strings we can construct it from parts
  var loader = new THREE.FileLoader();
  loader.setResponseType('text');
  loader.load('shaders/deferred/globalpass.glsl', function(global){
    loader.load('shaders/deferred/localpass.glsl', function(local){
      loader.load('shaders/deferred/comppass.glsl', function(comp){
        gPass = global;
        lPass = local;
        cPass = comp;
        finishInit();
      });
    });
  });
}

var local_renderTarget, global_renderTarget;

var finishInit = function(){
  var deferTexParams = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBFormat
  };
  //deferTexParams.depthTexture.type = THREE.UnsignedShortType;

  local_renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, deferTexParams);
  global_renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, deferTexParams);

  g_mat_global = new THREE.ShaderMaterial({
    uniforms:{
      isStereo:{type: "i", value: 0},
      screenResolution:{type:"v2", value:g_screenResolution},
      fov:{type:"f", value:90},
      invGenerators:{type:"m4v", value:invGens},
      currentBoost:{type:"m4", value:g_currentBoost},
      stereoBoosts:{type:"m4v", value:g_stereoBoosts},
      cellBoost:{type:"m4", value:g_cellBoost},
      invCellBoost:{type:"m4", value:g_invCellBoost},
      maxSteps:{type:"i", value:maxSteps},
      lightPositions:{type:"v4v", value:lightPositions},
      lightIntensities:{type:"v3v", value:lightIntensities},
      tex:{type:"t", value: new THREE.TextureLoader().load("images/concrete2.png")},
      controllerCount:{type:"i", value: 0},
      controllerBoosts:{type:"m4", value:g_controllerBoosts},
      globalObjectBoost:{type:"m4v", value:globalObjectBoost},
      globalObjectRadius:{type:"v3v", value:globalObjectRadius}
    },
    defines:{
      NUM_LIGHTS: lightPositions.length
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: gPass,
    transparent:true
  });

  g_mat_local = new THREE.ShaderMaterial({
    uniforms:{
      isStereo:{type: "i", value: 0},
      screenResolution:{type:"v2", value:g_screenResolution},
      fov:{type:"f", value:90},
      invGenerators:{type:"m4v", value:invGens},
      currentBoost:{type:"m4", value:g_currentBoost},
      stereoBoosts:{type:"m4v", value:g_stereoBoosts},
      cellBoost:{type:"m4", value:g_cellBoost},
      invCellBoost:{type:"m4", value:g_invCellBoost},
      maxSteps:{type:"i", value:maxSteps},
      tex:{type:"t", value: new THREE.TextureLoader().load("images/concrete2.png")},
      halfCubeWidthKlein:{type:"f", value: hCWK},
      tubeRad:{type:"f", value:g_tubeRad},
      cellPosition:{type:"v4", value:g_cellPosition},
      cellSurfaceOffset:{type:"f", value:g_cellSurfaceOffset},
      vertexPosition:{type:"v4", value:g_vertexPosition},
      vertexSurfaceOffset:{type:"f", value:g_vertexSurfaceOffset},
      useSimplex:{type:"b", value:false},
      simplexMirrorsKlein:{type:"v4v", value:simplexMirrors},
      cut1:{type:"i", value:g_cut1},
	  	cut4:{type:"i", value:g_cut4}
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: lPass,
    transparent:true
  });
  
  g_mat_comp = new THREE.ShaderMaterial({
    uniforms:{
      localDiffuse:{type:"t", value: local_renderTarget.texture},
      globalDiffuse:{type:"t", value: global_renderTarget.texture},
      localDepth:{type:"t", value:local_renderTarget.depthTexture},
      globalDepth:{type:"t", value:global_renderTarget.depthTexture}
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: cPass,
    transparent:true
  });

  g_effect.setSize(g_screenResolution.x, g_screenResolution.y);
  //Setup dat GUI --- SceneManipulator.js
  initGui();

  var geom = new THREE.PlaneGeometry(2,2);

  var mesh_global = new THREE.Mesh(geom, g_mat_global);
  var mesh_local = new THREE.Mesh(geom, g_mat_local);
  var mesh_comp = new THREE.Mesh(geom, g_mat_comp);

  global_scene.add(mesh_global);
  local_scene.add(mesh_local);
  comp_scene.add(mesh_comp);
  animate();
}

//-------------------------------------------------------
// Where our scene actually renders out to screen
//-------------------------------------------------------
var animate = function(){
  maxSteps = calcMaxSteps(fps.getFPS(), maxSteps);
  g_mat_global.uniforms.maxSteps.value = maxSteps;
  g_mat_local.uniforms.maxSteps.value = maxSteps;

  g_controls.update();
  THREE.VRController.update();
  
  renderer.setRenderTarget(local_renderTarget);
  renderer.clear();
  renderer.render(local_scene, camera);

  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(comp_scene, camera);
  
  //g_effect.render(global_scene, camera, animate);

  requestAnimationFrame(animate);

}

//-------------------------------------------------------
// Where the magic happens
//-------------------------------------------------------
if(mobileCheck()){
  window.location.replace("http://www.michaelwoodard.net/hypVR-Ray_m/")
}
else{
  init();
}