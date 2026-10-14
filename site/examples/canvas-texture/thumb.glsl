void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/u_resolution;float t=u_time;float bar=step(.45,uv.y)*step(uv.y,.6)*step(fract((uv.x+sin(uv.y*40.+t)*.01)*6.),.5);
            vec3 c=mix(vec3(.03,.04,.1),vec3(.1,.05,.2),uv.y)+vec3(bar)*vec3(1.,.4,.4)*.5+vec3(step(.45,uv.y)*step(uv.y,.6)*step(fract((uv.x+.02)*6.),.5))*vec3(.3,.5,1.)*.5;
            c*=.9+.1*sin(fc.y*2.);o=vec4(c,1.);}
