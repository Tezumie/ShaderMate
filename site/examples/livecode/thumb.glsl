void mainImage(out vec4 o,in vec2 fc){vec2 p=(fc-.5*u_resolution)/u_resolution.y;float a=atan(p.y,p.x),r=length(p);vec2 uv=vec2(.25/r+u_time*.4,a*.5);
            float f=sin(uv.x*10.)*sin(uv.y*10.);vec3 c=.5+.5*cos(u_time+uv.xyx*4.+vec3(0,2,4));o=vec4(c*smoothstep(-.2,.6,f)*r*2.2,1.);}
