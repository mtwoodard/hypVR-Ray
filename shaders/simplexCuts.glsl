float localSceneSDF(vec4 samplePoint){
    float sphere = sphereSDF(samplePoint, ORIGIN, sphereRad);
    float vertexSphere = 0.0;
    if(cut4 == 1) {
        vertexSphere = sphereSDF(abs(samplePoint), vertexKlein, vertexSurfaceOffset);
    }
    else if(cut4 == 2) {
        vertexSphere = horosphereHSDF(abs(samplePoint), vertexKlein, vertexSurfaceOffset);
    }
    else if(cut4 == 3) {
        vertexSphere = geodesicPlaneHSDF(abs(samplePoint), vertexKlein, vertexSurfaceOffset);
    }
    float final = -unionSDF(vertexSphere,sphere);
    return final;
}