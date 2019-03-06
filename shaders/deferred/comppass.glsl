#version 300 es
in vec2 vUV;

uniform sampler2D localDiffuse;
uniform sampler2D globalDiffuse;
uniform sampler2D localDepth;
uniform sampler2D globalDepth;

out vec4 out_FragColor;

void main(){
    out_FragColor = texture(localDiffuse, vUV);
    //out_FragColor = vec4(1.0,0.0,0.0, 1.0);
}