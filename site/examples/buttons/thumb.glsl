void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/u_resolution;vec2 p=uv*vec2(u_aspect,1.)*3.;float t=u_time*.7;
            float v=sin(p.x+t)+sin(p.y+t*.7)+sin((p.x+p.y)*.7+t*1.3);vec3 c=(.5+.5*cos(6.2831*(v*.15+vec3(0.,.33,.67))))*.45;o=vec4(c,1.);}
