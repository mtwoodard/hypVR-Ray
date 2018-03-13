# hypVR-Ray
Hyperbolic VR using Raymarching.

Based on the websperience  by Vi Hart, Andrea Hawksley, and Henry Segerman featured over at https://github.com/hawksley/hypVR. This project seeks to improve upon the original by using raymarching as a technique to improve the visible depth of the environment. HypVR-Ray is being worked by Michael Woodard and Henry Segerman and is helped by the work of Jeff Week's Curved Spaces, Mozilla's webVR framework for THREEjs, and Jamie Wong's Ray Marching and Signed Distance Functions.

Check out this project at www.michaelwoodard.net/hypVR-Ray/ 

# Links
* http://michaelwoodard.net
* http://segerman.org/
* http://vihart.com
* http://andreahawksley.com
* http://www.geometrygames.org/CurvedSpaces/
* https://github.com/MozVR/vr-web-examples/tree/master/threejs-vr-boilerplate
* http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/


# Running Locally
Running this locally requires a simple web server (to source the shader files at runtime), with the root at the same level as index.html. This can be done in python 3 by running the command "python -m http.server". On Windows, you can set up a server in the Control Panel Administrative Tools, in the IIS Manager (you may need to turn this feature on first). NOTE: The server will need to have a MIME type configuration for .glsl files set to "text/plain".
