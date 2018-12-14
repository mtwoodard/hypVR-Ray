float localSceneSDF(vec4 samplePoint) {
    float sphere = 0.0;
    if(cut1 == 1) {
        sphere = sphereSDF(samplePoint, cellPosition, cellSurfaceOffset);
    }
    else if(cut1 == 2) {
        sphere = horosphereHSDF(samplePoint, cellPosition, cellSurfaceOffset);
    }
    else if(cut1 == 3) {
        sphere = geodesicPlaneHSDF(samplePoint, cellPosition, cellSurfaceOffset);
    }

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