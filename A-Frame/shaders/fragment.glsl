varying vec2 vUv;
uniform vec3 color;
uniform float time;

void main(){
  gl_FragColor = mix(
    vec4(mod(vUv, 0.05) * 20.0, 1.0, 1.0),
    vec4(color, 1.0),
    sin(time));
}
