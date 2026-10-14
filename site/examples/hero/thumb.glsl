void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/u_resolution;float t=u_time*.3;vec3 c=vec3(.06,.1,.2);
            for(int i=0;i<3;i++){float fi=float(i);float y=.3+.2*fi+.08*sin(uv.x*4.*u_aspect+t+fi*2.);float d=uv.y-y;c=mix(c,vec3(.0,.3+.2*fi,.6+.1*fi)*.6,smoothstep(.01,-.01,d));c+=vec3(.5,.75,1.)*exp(-abs(d)*90.)*.5;}o=vec4(c,1.);}
