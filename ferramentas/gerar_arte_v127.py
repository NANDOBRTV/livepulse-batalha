#!/usr/bin/env python3
"""Creates independent transparent optical layers, not flattened HUD snapshots."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math, random, json, hashlib

OUT=Path('/mnt/data/livepulse_v127_work/art/livepulse_visual')
OUT.mkdir(parents=True,exist_ok=True)
RAND=random.Random(127)


def glow(size,lobes):
    w,h=size;y,x=np.mgrid[0:h,0:w];a=np.zeros((h,w),np.float64)
    chroma=np.zeros((h,w,3),np.float64)
    for (px,py,sx,sy,power,color) in lobes:
        weight=np.exp(-(((x-px)/sx)**2+((y-py)/sy)**2)*1.4)*power
        chroma+=weight[...,None]*np.array(color)[None,None,:]
        a+=weight
    a=np.maximum(a,1e-7)
    rgb=np.clip(chroma/a[...,None],0,255).astype('uint8')
    alpha=np.clip(a,0,235).astype('uint8')
    alpha[:2,:]=0;alpha[-2:,:]=0;alpha[:,:2]=0;alpha[:,-2:]=0
    return Image.fromarray(np.dstack((rgb,alpha)),'RGBA')

def draw_ring(draw,cx,cy,r,fill,width=2,start=0,stop=360):
    draw.arc((cx-r,cy-r,cx+r,cy+r),start,stop,fill=fill,width=width)

def save(img,name):
    assert img.mode=='RGBA'
    assert img.getextrema()[3][0]==0, name+' alpha not transparent'
    img.save(OUT/name,optimize=True)
    return name

# Dragons: detached orange-ember / blue-arcane wing light, sized to existing 330x240 sprite.
for team,color,bright in [('chat',(255,70,35),(255,197,109)),('creator',(31,163,252),(133,231,255))]:
    w,h=330,240
    im=glow((w,h),[(175,130,118,89,100,color),(180,130,59,50,68,bright),(125,145,30,26,36,color)])
    fx=Image.new('RGBA',(w,h));d=ImageDraw.Draw(fx)
    for i in range(20):
        a=(i/20)*2*math.pi
        r=85+11*math.sin(i*2.4)
        px=int(170+math.cos(a)*r);py=int(130+math.sin(a)*r*.69)
        if RAND.random()<.45:continue
        t=RAND.choice([2,3,4]);o=RAND.randint(72,180)
        d.line((px-t,py,px+t,py),fill=(*bright,o),width=1)
        d.line((px,py-t,px,py+t),fill=(*bright,o),width=1)
    draw_ring(d,173,129,83,(*bright,75),2,205,333)
    draw_ring(d,173,129,91,(*color,70),2,25,165)
    im=Image.alpha_composite(im,fx)
    save(im,f'v127_dragon_{team}_aura.png')

# Three boss crests, each phase with distinct ritual geometry and hue.
for phase,color in [(1,(171,76,240)),(2,(244,62,135)),(3,(255,84,98))]:
    w=h=360;cx=cy=180
    im=glow((w,h),[(cx,cy,125,125,72,color),(cx,cy,61,62,35,(238,203,255))])
    fx=Image.new('RGBA',(w,h));d=ImageDraw.Draw(fx)
    draw_ring(d,cx,cy,146,(*color,113),2,0,360)
    draw_ring(d,cx,cy,133,(238,190,255,145),2,0,360)
    draw_ring(d,cx,cy,122,(*color,83),2,9,161)
    draw_ring(d,cx,cy,122,(*color,83),2,189,341)
    draw_ring(d,cx,cy,105,(*color,61),3,0,360)
    for j in range(12):
        a=(j*math.pi/6)+math.pi/12
        p=(cx+133*math.cos(a),cy+133*math.sin(a))
        q=(cx+147*math.cos(a),cy+147*math.sin(a))
        d.line((*p,*q),fill=(*color,173),width=2)
    for j in range(9):
        a=(j*math.pi*2/9)+(phase*.09)
        p=(cx+119*math.cos(a),cy+119*math.sin(a))
        q=(cx+127*math.cos(a+.10),cy+127*math.sin(a+.10))
        r=(cx+132*math.cos(a-.07),cy+132*math.sin(a-.07))
        d.line((p,q,r,p),fill=(236,204,255,110),width=2)
    d.polygon([(cx,cy-164),(cx+9,cy-146),(cx,cy-138),(cx-9,cy-146)],fill=(250,206,255,210))
    d.polygon([(cx,cy+164),(cx+9,cy+146),(cx,cy+138),(cx-9,cy+146)],fill=(250,206,255,180))
    im=Image.alpha_composite(im,fx)
    save(im,f'v127_boss_sigil_{phase}.png')

# Twin tower cores: full independent images for aura/shield behind original animated tower sprites.
for team,color,bright in [('chat',(248,65,85),(255,202,122)),('creator',(25,154,249),(160,237,255))]:
    im=glow((300,300),[(150,155,106,111,86,color),(150,172,44,85,58,bright)])
    fx=Image.new('RGBA',im.size);d=ImageDraw.Draw(fx)
    for r,op in [(78,85),(100,57),(121,39)]:draw_ring(d,150,163,r,(*bright,op),2,210,330)
    for i in range(12):
        a=i*math.pi/6
        x=int(150+117*math.cos(a));y=int(165+108*math.sin(a))
        if i%3==0:
            d.polygon([(x,y-4),(x+4,y),(x,y+4),(x-4,y)],fill=(*bright,130))
    d.line((150,39,150,117),fill=(*bright,80),width=2)
    im=Image.alpha_composite(im,fx)
    save(im,f'v127_tower_{team}_aura.png')

# Two-layer perspective: high atmospheric beams and foot mist (background only, no foreground elements).
w,h=660,930
im=glow((w,h),[(330,112,250,395,52,(161,89,223)),(170,350,110,460,34,(195,46,87)),(500,360,130,470,34,(65,163,255)),(330,815,320,115,49,(135,95,185))])
fx=Image.new('RGBA',(w,h));d=ImageDraw.Draw(fx)
for x,opa in [(135,18),(270,23),(420,20),(545,15)]:
    d.polygon([(330,65),(x-29,750),(x+34,750)],fill=(214,177,245,opa))
for idx in range(24):
    x=RAND.randint(110,555);y=RAND.randint(100,700);r=RAND.choice([1,1,1,2]);op=RAND.randint(40,115)
    d.ellipse((x-r,y-r,x+r,y+r),fill=(241,231,255,op))
im=Image.alpha_composite(im,fx)
save(im,'v127_depth_rays.png')
im=glow((660,290),[(330,216,325,74,75,(128,153,230)),(130,175,160,88,50,(239,73,115)),(545,171,160,100,49,(62,188,255))])
save(im,'v127_ground_mist.png')

# Translucent impact / projectile energy bloom.
for team,color,bright in [('chat',(255,68,61),(255,218,141)),('creator',(47,158,251),(183,243,255))]:
    w=h=320;cx=cy=160
    im=glow((w,h),[(160,160,85,83,104,color),(160,160,28,28,100,bright)])
    fx=Image.new('RGBA',im.size);d=ImageDraw.Draw(fx)
    for i in range(16):
        a=i*math.pi/8+0.13;r0=RAND.randint(22,44);r1=RAND.randint(100,149)
        x0=cx+math.cos(a)*r0;y0=cy+math.sin(a)*r0
        x1=cx+math.cos(a)*r1;y1=cy+math.sin(a)*r1
        d.line((x0,y0,x1,y1),fill=(*bright,RAND.randint(60,170)),width=RAND.choice([1,2,3]))
    draw_ring(d,160,160,76,(*bright,130),3,8,155)
    draw_ring(d,160,160,76,(*bright,130),3,188,339)
    im=Image.alpha_composite(im,fx)
    save(im,f'v127_impact_{team}.png')

# Independent blue crystal shield and golden victory flare.
im=glow((300,300),[(150,150,108,110,86,(51,152,252)),(150,150,67,67,40,(167,247,255))])
fx=Image.new('RGBA',im.size);d=ImageDraw.Draw(fx)
draw_ring(d,150,150,117,(112,228,255,156),3,0,360)
draw_ring(d,150,150,97,(221,250,255,133),2,0,360)
for i in range(8):
 a=i*math.pi/4
 p=(150+119*math.cos(a),150+119*math.sin(a));q=(150+129*math.cos(a),150+129*math.sin(a))
 d.line((*p,*q),fill=(214,255,255,180),width=3)
im=Image.alpha_composite(im,fx)
save(im,'v127_shield_aura.png')
im=glow((420,420),[(210,210,178,172,112,(255,177,63)),(210,210,67,66,99,(255,241,168))])
fx=Image.new('RGBA',im.size);d=ImageDraw.Draw(fx)
for i in range(24):
 a=i*math.pi/12;ra=RAND.randint(77,94);rb=RAND.randint(150,199)
 d.line((210+ra*math.cos(a),210+ra*math.sin(a),210+rb*math.cos(a),210+rb*math.sin(a)),fill=(255,242,174,RAND.randint(65,140)),width=RAND.choice([1,2,3]))
for r in [123,139,169]:draw_ring(d,210,210,r,(255,221,134,65),2,0,360)
im=Image.alpha_composite(im,fx)
save(im,'v127_victory_burst.png')

summary={p.name:{'width':Image.open(p).width,'height':Image.open(p).height,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size} for p in sorted(OUT.glob('v127_*.png'))}
(OUT.parent.parent/'art_manifest_v127.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False))
print('Generated',len(summary),'independent transparent PNGs; total compressed',sum(i['bytes'] for i in summary.values()))
for name,data in summary.items():print(name, f"{data['width']}x{data['height']}",data['bytes'])
