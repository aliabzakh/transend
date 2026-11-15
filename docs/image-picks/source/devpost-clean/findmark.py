import sys,os,glob
import numpy as np
from PIL import Image
def label(mask):
    """4-connected components without scipy: returns list of (ys,xs) arrays."""
    h,w=mask.shape; lab=np.zeros((h,w),int); comps=[]; n=0
    ys,xs=np.nonzero(mask)
    for y,x in zip(ys,xs):
        if lab[y,x]: continue
        n+=1; stack=[(y,x)]; lab[y,x]=n; pts=[]
        while stack:
            cy,cx=stack.pop(); pts.append((cy,cx))
            for ny,nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
                if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not lab[ny,nx]:
                    lab[ny,nx]=n; stack.append((ny,nx))
        comps.append(np.array(pts))
    return comps
def find(path):
    a=np.asarray(Image.open(path).convert('RGB')).astype(int); r,g,b=a[...,0],a[...,1],a[...,2]
    gold=(r>190)&(g>130)&(g<200)&(b<110)&(r-g>25)
    green=(g>r+50)&(g>b+25)&(g>140)
    hits=[]
    for c in label(gold):
        if len(c)<15 or len(c)>2500: continue
        y0,x0=c.min(0); y1,x1=c.max(0); d=max(y1-y0,x1-x0)+1
        if d>60 or d<6: continue
        if abs((y1-y0)-(x1-x0))>max(3,d*0.35): continue
        # ring: centre pixel not gold
        cy,cx=(y0+y1)//2,(x0+x1)//2
        if gold[cy,cx]: continue
        X0,X1=int(cx-2.6*d),int(cx+2.6*d); Y0,Y1=int(y0-0.2*d),int(y0+3.4*d)
        X0,Y0=max(X0,0),max(Y0,0); win=green[Y0:Y1,X0:X1]
        if win.size==0: continue
        w=win.shape[1]; L=win[:, :w//3].sum(); R=win[:, 2*w//3:].sum(); M=win[:, w//3:2*w//3].sum()
        if L<d*2 or R<d*2 or M<d*2: continue
        gy,gx=np.nonzero(win)
        bb=(X0+gx.min(),Y0+min(gy.min(),y0-Y0),X0+gx.max()+1,Y0+gy.max()+1)
        hits.append(dict(halo=(int(cx),int(cy),int(d)),bbox=tuple(int(v) for v in bb)))
    return hits
if __name__=='__main__':
    for f in sorted(glob.glob(os.path.join(sys.argv[1],'*.png'))):
        h=find(f)
        if h: print(os.path.basename(f), h)
