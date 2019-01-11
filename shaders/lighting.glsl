//--------------------------------------------------------------------
// Lighting Functions
//--------------------------------------------------------------------

//Essentially we are starting at our sample point then marching to the light
//If we make it to/past the light without hitting anything we return 1
//otherwise the spot does not receive light from that light source
//Based off of Inigo Quilez's soft shadows https://iquilezles.org/www/articles/rmshadows/rmshadows.htm
float shadowMarch(vec4 origin, vec4 dirToLight, float distToLight, mat4 globalTransMatrix){
    float localDepth = EPSILON * 100.0;
    float globalDepth = localDepth;
    vec4 localrO = origin;
    vec4 localrD = dirToLight;
    mat4 fixMatrix = mat4(1.0);
    float k = shadSoft;
    float result = 1.0;
    
    //Local Trace for shadows
    if(renderShadows[0]){
      for(int i = 0; i < MAX_MARCHING_STEPS; i++){
        vec4 localEndPoint = pointOnGeodesic(localrO, localrD, localDepth);

        if(isOutsideCell(localEndPoint, fixMatrix)){
          localrO = geometryNormalize(localEndPoint*fixMatrix, false);
          localrD = geometryFixDirection(localrO, localrD, fixMatrix);
          localDepth = MIN_DIST; 
        }
        else{
          float localDist = min(0.5,localSceneSDF(localEndPoint));
          if(localDist < EPSILON){
            return 0.0;
          }
          localDepth += localDist;
          globalDepth += localDist;
          result = min(result, k*localDist/globalDepth);
          if(globalDepth > distToLight){
            break;
          }
        }
      }  
    }

    //Global Trace for shadows
    if(renderShadows[1]){
      globalDepth = EPSILON * 100.0;
      for(int i = 0; i< MAX_MARCHING_STEPS; i++){
        vec4 globalEndPoint = pointOnGeodesic(origin, dirToLight, globalDepth);
        float globalDist = globalSceneSDF(globalEndPoint, globalTransMatrix, false);
        if(globalDist < EPSILON){
          return 0.0;
        }
        globalDepth += globalDist;
        result = min(result, k*globalDist/globalDepth);
        if(globalDepth > distToLight){
          return result;
        }
      }
      return result;
    }
    return result;
}

vec4 texcube(vec4 samplePoint, mat4 toOrigin){
    float k = 4.0;
    vec4 newSP = samplePoint * toOrigin;
    vec3 p = mod(newSP.xyz,1.0);
    vec3 n = geometryNormalize(N*toOrigin, true).xyz; //Very hacky you are warned
    vec3 m = pow(abs(n), vec3(k));
    vec4 x = texture2D(texture, p.yz);
    vec4 y = texture2D(texture, p.zx);
    vec4 z = texture2D(texture, p.xy);
    return (x*m.x + y*m.y + z*m.z) / (m.x+m.y+m.z);
}


float attenuation(float distToLight, vec4 lightIntensity){
  float att;
  if(attnModel == 1) //Inverse Linear
    att  = 0.75/ (0.01+lightIntensity.w * distToLight);  
  else if(attnModel == 2) //Inverse Square
    att  = 1.0/ (0.01+lightIntensity.w * distToLight* distToLight);
  else if(attnModel == 3) // Inverse Cube
    att = 1.0/ (0.01+lightIntensity.w*distToLight*distToLight*distToLight);
  else if(attnModel == 4) //Physical
    att  = 1.0/ (0.01+lightIntensity.w*cosh(2.0*distToLight)-1.0);
  else //None
    att  = 0.25; //if its actually 1 everything gets washed out
  return att;
}

vec3 lightingCalculations(vec4 SP, vec4 TLP, vec4 V, vec3 baseColor, vec4 lightIntensity, mat4 globalTransMatrix){
  float distToLight = geometryDistance(SP, TLP);
  float att = attenuation(distToLight, lightIntensity);
  //Calculations - Phong Reflection Model
  vec4 L = geometryDirection(SP, TLP);
  vec4 R = 2.0*geometryDot(L, N)*N - L;
  //Calculate Diffuse Component
  float nDotL = max(geometryDot(N, L),0.0);
  vec3 diffuse = lightIntensity.rgb * nDotL;
  //Calculate Shadows
  float shadow = 1.0;
  shadow = shadowMarch(SP, L, distToLight, globalTransMatrix);
  //Calculate Specular Component
  float rDotV = max(geometryDot(R, V),0.0);
  vec3 specular = lightIntensity.rgb * pow(rDotV,10.0);
  //Compute final color
  return att*(shadow*((diffuse*baseColor) + specular));
}

vec3 phongModel(mat4 invObjectBoost, bool isGlobal, mat4 globalTransMatrix){
  //--------------------------------------------
  //Setup Variables
  //--------------------------------------------
  float ambient = 0.1;
  vec3 baseColor = vec3(0.0,1.0,1.0);
  vec4 SP = sampleEndPoint;
  vec4 TLP;
  vec4 V = -sampleTangentVector;

  if(isGlobal){ //this may be possible to move outside function as we already have an if statement for global v. local
    baseColor = texcube(SP, cellBoost * invObjectBoost).xyz; 
  }
  else{
    baseColor = texcube(SP, mat4(1.0)).xyz;
  }

  //Setup up color with ambient component
  vec3 color = baseColor * ambient; 

  //--------------------------------------------
  //Lighting Calculations
  //--------------------------------------------
  //Standard Light Objects
  for(int i = 0; i<NUM_LIGHTS; i++){
    if(lightIntensities[i].w != 0.0){
      TLP = lightPositions[i]*globalTransMatrix;
      color += lightingCalculations(SP, TLP, V, baseColor, lightIntensities[i], globalTransMatrix);
    }
  }

  //Lights for Controllers
  for(int i = 0; i<2; i++){
    if(controllerCount == 0) break; //if there are no controllers do nothing
    else TLP = ORIGIN*controllerBoosts[i]*currentBoost*cellBoost*globalTransMatrix;

    color += lightingCalculations(SP, TLP, V, baseColor, lightIntensities[i+4], globalTransMatrix);

    if(controllerCount == 1) break; //if there is one controller only do one loop
  }

  return color;
}