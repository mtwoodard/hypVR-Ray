AFRAME.registerComponent('rendertexture',{
  schema:{
    left: {type: 'number', default: -1},
    right:{tpye: 'number', default: 1},
    up:{type: 'number', default: 1},
    down: {type: 'number', default: -1}
  },
  init: function(){
    var data = this.data;
    var el = this.el;
    this.material = raymarch; //global defined in custom.js
    this.geometry = new THREE.BufferGeometry();
    var vertices = new Float32Array([
      -1.0, -1.0, 0.0,
       1.0, -1.0, 0.0,
       1.0,  1.0, 0.0,

      -1.0, -1.0, 0.0,
       1.0,  1.0, 0.0,
      -1.0,  1.0, 0.0
    ]);
    this.geometry.addAttribute('position', new THREE.BufferAttribute(vertices,3));

    this.mesh = new THREE.Mesh(this.geometry,this.material);
    el.setObject3D('mesh', this.mesh);
  },
  update: function(oldData){
    var data = this.data;
    var el = this.el;
    // If `oldData` is empty, then this means we're in the initialization process.
    // No need to update.
    if(Object.keys(oldData).length === 0){return;}
    // In case we need to update the geometry or material
    // do it here.
  },
  remove: function(){
    this.el.removeObject3D('mesh');
  }
});
