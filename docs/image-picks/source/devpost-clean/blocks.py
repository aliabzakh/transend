import sys,os,glob
import numpy as np
from PIL import Image
def blocks(path, gap=22, thr=60):
    a=np.asarray(Image.open(path).convert('RGB')).astype(int)
    bg=a[:, 6:7, :]                      # per-row background from the left edge
    diff=np.abs(a-bg).sum(axis=2)        # h x w
    content=diff>thr
    rows=content.any(axis=1)
    out=[]; y=0; H=len(rows)
    while y<H:
        if rows[y]:
            y0=y; last=y
            while y<H and (rows[y] or y-last<gap):
                if rows[y]: last=y
                y+=1
            y1=last+1
            cols=content[y0:y1].any(axis=0); xs=np.where(cols)[0]
            px=a[y0:y1][content[y0:y1]]
            out.append((y0,y1,int(xs[0]),int(xs[-1]),tuple(int(v) for v in px.mean(axis=0))))
        else: y+=1
    return out
if __name__=='__main__':
    for f in sorted(glob.glob(os.path.join(sys.argv[1],'*.png'))):
        print('==',os.path.basename(f))
        for i,b in enumerate(blocks(f)): print('  ',i,b)
