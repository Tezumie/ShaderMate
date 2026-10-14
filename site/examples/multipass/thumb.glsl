float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
            void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/u_resolution*vec2(u_aspect,1.);float t=u_time*.2;float a=n(uv*3.+t)*6.2831;vec2 d=vec2(cos(a),sin(a));
            float s=sin(dot(uv,d)*18.+t*4.);vec3 c=(.5+.5*cos(6.2831*(n(uv*2.-t)+vec3(0.,.33,.67))))*smoothstep(.2,1.,s)*.7;o=vec4(c,1.);}
