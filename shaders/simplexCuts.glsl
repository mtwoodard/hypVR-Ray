
float localSceneHSDF(vec4 samplePoint){
    float sphere = sphereHSDF(samplePoint, ORIGIN, sphereRad);
    float vertexSphere = 0.0;
     if(cut4 == 2) {
         vertexSphere = horosphereHSDF(abs(samplePoint), idealCubeCornerKlein, horosphereSize);
    }
	if(cut4 == 1 || cut4 == 3) {	// Interesting that this works for finite spheres as well.
        vec4 dualPoint = geometryNormalize(vec4(halfCubeWidthKlein,halfCubeWidthKlein,halfCubeWidthKlein,1.0));
        vertexSphere = geodesicPlaneHSDF(abs(samplePoint), dualPoint, planeOffset);
    }
    float final = -unionSDF(vertexSphere,sphere);
    return final;
}