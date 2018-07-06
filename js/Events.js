//--------------------------------------------------------------------
// Handle window resize
//--------------------------------------------------------------------
var onResize = function(){
        g_effect.setSize(window.innerWidth, window.innerHeight);
        if(g_material != null){
            g_material.uniforms.screenResolution.value.x = window.innerWidth;
            g_material.uniforms.screenResolution.value.y = window.innerHeight;
        }
  }
  window.addEventListener('resize', onResize, false);

//--------------------------------------------------------------------
// Handle VR Controllers
//-------------------------------------------------------------------- 
  var onControllerConnected = function(event){
    var controller = event.detail;
   // controller.head = new THREE.Vector3(0,0,0) * g_currentBoost;
    console.log(controller.inspect());  
    controller.addEventListener('primary press began', function(event){
  
    });
    controller.addEventListener('primary press ended', function(event){
  
    });
    controller.addEventListener('disconnected', function(event){
      //controller.parent.remove(controller);
    });
  }
  
  window.addEventListener('vr controller connected', onControllerConnected);

//--------------------------------------------------------------------
// Listens for double click to enter fullscreen VR mode
//--------------------------------------------------------------------
document.body.addEventListener('click', function(event){
    if(event.target.id === "vr-icon"){
        event.target.style.display = "none";
        g_effect.phoneVR.setVRMode(!renderer.phoneVR.isVRMode);
    }
    if(g_effect.phoneVR.orientationIsAvailable()){
        g_effect.setFullScreen(true);
        if(typeof window.screen.orientation !== 'undefined' && typeof window.screen.orientation.lock === 'function')
            window.screen.orientation.lock('landscape-primary');
    }
});

//--------------------------------------------------------------------
// Handle keyboard events
//--------------------------------------------------------------------
function onkey(event){
    event.preventDefault();

    if(event.keyCode == 90) // z
        g_controls.zeroSensor();
    else if(event.keyCode == 70) // f
        g_effect.setFullScreen(true);
    else if(event.keyCode == 86 || event.keyCode == 13 || event.keyCode == 32)
        g_effect.toggleVRMode();
}

window.addEventListener("keydown", onkey, false);

//--------------------------------------------------------------------
// Listen for keys for movement/rotation
//--------------------------------------------------------------------
function key(event, sign){
    var control = g_controls.manualControls[event.keyCode];
    if(control == undefined || sign === 1 && control.active || sign == -1 && !control.active) return;

    control.active = (sign === 1);
    if (control.index <= 2)
        g_controls.manualRotateRate[control.index] += sign * control.sign;
    else if (control.index <= 5)
        g_controls.manualMoveRate[control.index - 3] += sign * control.sign;

    
}

document.addEventListener('keydown', function(event){key(event, 1);}, false);
document.addEventListener('keyup', function(event){key(event, -1);}, false);

//--------------------------------------------------------------------
// Phone screen tap for movement
//--------------------------------------------------------------------
function tap(event, sign){
    g_controls.manualMoveRate[0] += sign;
}

document.addEventListener('touchstart', function(event){tap(event, 1);}, false);
document.addEventListener('touchend', function(event){tap(event, -1);}, false);
