
float localSceneSDF(vec4 samplePoint){
    float sphere = sphereSDF(samplePoint, ORIGIN, sphereRad);
    float vertexSphere = 0.0;
    if(cut4 == 1){
        vec4 vertexPos = geometryNormalize(vec4(halfCubeWidthKlein,halfCubeWidthKlein,halfCubeWidthKlein,1.0), true); //move into JS
        vertexSphere = sphereSDF(abs(samplePoint), vertexPos, planeOffset);
    }
    else if(cut4 == 2) {
        vertexSphere = horosphereHSDF(abs(samplePoint), idealCubeCornerKlein, horosphereSize);
    }
	else if(cut4 == 3) {	// Interesting that this works for finite spheres as well.
        vec4 dualPoint = geometryNormalize(vec4(halfCubeWidthKlein,halfCubeWidthKlein,halfCubeWidthKlein,1.0), true); //move into JS
        vertexSphere = geodesicPlaneHSDF(abs(samplePoint), dualPoint, planeOffset);
    }
    float final = -unionSDF(vertexSphere,sphere);
    return final;
}