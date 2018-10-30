float localSceneSDF(vec4 samplePoint){
    float sphere = sphereSDF(samplePoint, ORIGIN, sphereRad);
    float vertexSphere = 0.0;
    if(cut4 == 1) {
        vertexSphere = sphereSDF(abs(samplePoint), vertexPosition, vertexSurfaceOffset);
    }
    else if(cut4 == 2) {
        vertexSphere = horosphereHSDF(abs(samplePoint), vertexPosition, vertexSurfaceOffset);
    }
    else if(cut4 == 3) {
        vertexSphere = geodesicPlaneHSDF(abs(samplePoint), vertexPosition, vertexSurfaceOffset);
    }
    float final = -unionSDF(vertexSphere,sphere);
    return final;
}