//-------------------------------------------------------
// Global Variables
//-------------------------------------------------------
var g_effect;
var g_material;
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
var scene;
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
var globalObjectBoosts = [];
var invGlobalObjectBoosts = [];
var globalObjectRadii = [];
var globalObjectTypes = [];

//TODO: CREATE GLOBAL OBJECT CONSTRUCTORS
var initObjects = function(g){
  globalObjectBoosts = [];
  invGlobalObjectBoosts = [];
  globalObjectRadii = [];
  globalObjectTypes = [];
  SphereObject(g, new THREE.Vector3(-0.5,0,0), 0.2); // geometry, position, radius/radii
  SphereObject(g, new THREE.Vector3(0.5,0,0), 0.05); //radii must be less than one!
  for(var i = 2; i<4; i++){ // We need to fill out our arrays with empty objects for glsl to be happy
    EmptyObject();
  }
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
    scene = new THREE.Scene();
    var canvas  = document.createElement('canvas');
    var context = canvas.getContext('webgl2');
    renderer = new THREE.WebGLRenderer({canvas: canvas, context: context});
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

var globalsFrag;
var lightingFrag;
var geometryFrag = [];
var mainFrag;
var scenesFrag = [];

var loadShaders = function(){ //Since our shader is made up of strings we can construct it from parts
  var loader = new THREE.FileLoader();
  loader.setResponseType('text');
  loader.load('shaders/fragment.glsl',function(main){
    loader.load('shaders/simplexCuts.glsl', function(scene){
      loader.load('shaders/hyperbolic.glsl', function(hyperbolic){
        loader.load('shaders/lighting.glsl', function(lighting){
          loader.load('shaders/globalsInclude.glsl', function(globals){
          //pass full shader string to finish our init
          globalsFrag = globals;
          lightingFrag = lighting;
          geometryFrag.push(hyperbolic);
          scenesFrag.push(scene);
          mainFrag = main;
          finishInit(globals.concat(lighting).concat(hyperbolic).concat(scene).concat(main));
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
  });
  
}

var finishInit = function(fShader){
//  console.log(fShader);
  g_material = new THREE.ShaderMaterial({
    uniforms:{
      isStereo:{type: "i", value: 0},
      geometry:{type: "i", value: 3},
      screenResolution:{type:"v2", value:g_screenResolution},
      fov:{type:"f", value:90},
      invGenerators:{type:"m4v", value:invGens},
      currentBoost:{type:"m4", value:g_currentBoost},
      stereoBoosts:{type:"m4v", value:g_stereoBoosts},
      cellBoost:{type:"m4", value:g_cellBoost},
      invCellBoost:{type:"m4", value:g_invCellBoost},
      maxSteps:{type:"i", value:maxSteps},
      maxDist:{type:"f", value:maxDist},
			lightPositions:{type:"v4v", value:lightPositions},
      lightIntensities:{type:"v3v", value:lightIntensities},
      attnModel:{type:"i", value:attnModel},
      renderShadows:{type:"bv", value:[false, false]},
      shadSoft:{type:"f", value:128.0},
      tex:{type:"t", value: new THREE.TextureLoader().load("images/concrete2.png")},
      //tex:{type:"t", value: new THREE.TextureLoader().load("images/white.png")},   
      controllerCount:{type:"i", value: 0},
      controllerBoosts:{type:"m4", value:g_controllerBoosts},
      globalObjectBoosts:{type:"m4v", value:globalObjectBoosts},
      invGlobalObjectBoosts:{type:"m4v", value:invGlobalObjectBoosts},
      globalObjectRadii:{type:"v3v", value:globalObjectRadii},
			halfCubeDualPoints:{type:"v4v", value:hCDP},
      halfCubeWidthKlein:{type:"f", value: hCWK},
      cut1:{type:"i", value:g_cut1},
	  	cut4:{type:"i", value:g_cut4},
      tubeRad:{type:"f", value:g_tubeRad},
      cellPosition:{type:"v4", value:g_cellPosition},
      cellSurfaceOffset:{type:"f", value:g_cellSurfaceOffset},
      vertexPosition:{type:"v4", value:g_vertexPosition},
      vertexSurfaceOffset:{type:"f", value:g_vertexSurfaceOffset},
      useSimplex:{type:"b", value:false},
      simplexMirrorsKlein:{type:"v4v", value:simplexMirrors},
      simplexDualPoints:{type:"v4v", value:simplexDualPoints}
    },
    defines: {
      NUM_LIGHTS: lightPositions.length,
      NUM_OBJECTS: globalObjectBoosts.length
    },
    vertexShader: document.getElementById('vertexShader').textContent,
    fragmentShader: fShader,
    transparent:true
  });

  g_effect.setSize(g_screenResolution.x, g_screenResolution.y);
  //Setup dat GUI --- SceneManipulator.js
  initGui();

  //Setup a "quad" to render on-------------------------
  var geom = new THREE.BufferGeometry();
  var vertices = new Float32Array([
    -1.0, -1.0, 0.0,
     1.0, -1.0, 0.0,
     1.0,  1.0, 0.0,

    -1.0, -1.0, 0.0,
     1.0,  1.0, 0.0,
    -1.0,  1.0, 0.0
  ]);
  geom.addAttribute('position',new THREE.BufferAttribute(vertices,3));
  var mesh = new THREE.Mesh(geom, g_material);
  scene.add(mesh);

  animate();
}

//-------------------------------------------------------
// Where our scene actually renders out to screen
//-------------------------------------------------------
var animate = function(){
  maxSteps = calcMaxSteps(fps.getFPS(), maxSteps);
  g_material.uniforms.maxSteps.value = maxSteps;
  
  g_controls.update();
  THREE.VRController.update();
  
  g_effect.render(scene, camera, animate);
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