float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
            float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.1+5.;a*=.5;}return v;}
            void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/u_resolution*vec2(u_aspect,1.);float t=u_time*.1;vec2 q=vec2(fbm(uv+t),fbm(uv+3.-t));float f=fbm(uv+3.*q);
            vec3 c=mix(vec3(.02,.03,.1),vec3(.1,.5,.75),f*f*2.5);c=mix(c,vec3(.9,.3,.5),clamp(length(q)-.4,0.,1.)*.8);o=vec4(pow(c,vec3(1.5))*1.6,1.);}
