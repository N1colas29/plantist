import express from 'express';
import session from 'express-session';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url)),root=path.join(__dirname,'..'),
dataDir=path.join(__dirname,'data'),
uploads=path.join(__dirname,'uploads'),
dbFile=path.join(dataDir,'accounts.json');

fs.mkdirSync(dataDir,{recursive:true});

fs.mkdirSync(uploads,{recursive:true});

if(!fs.existsSync(dbFile))
    fs.writeFileSync(dbFile,JSON.stringify({accounts:[]},null,2));


const read=()=>{try{return JSON.parse(fs.readFileSync(dbFile,'utf8'))}catch{return{accounts:[]}}};

const write=d=>fs.writeFileSync(dbFile,JSON.stringify(d,null,2));

const id=p=>`${p}_${crypto.randomUUID()}`;

const safe=a=>{const{passwordHash,passwordSalt,...x}=a;return x};

const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>({passwordHash:crypto.scryptSync(p,s,64).toString('hex'),passwordSalt:s});


const app=express();app.use(express.json({limit:'2mb'}));

app.use(session({secret:process.env.SESSION_SECRET||'plantist-development-secret-change-me',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:false,maxAge:604800000}}));

const storage=multer.diskStorage({destination:uploads,filename:(_r,f,cb)=>cb(null,`${crypto.randomUUID()}${path.extname(f.originalname).toLowerCase()}`)});

const upload=multer({storage,limits:{fileSize:8*1024*1024}});

const me=req=>read().accounts.find(a=>a.id===req.session.accountId);

const auth=(req,res,next)=>me(req)?next():res.status(401).json({error:'Please log in first.'});
app.post('/api/auth/signup',upload.single('profile'),(req,res)=>{const username=String(req.body.username||'').trim().toLowerCase(),name=String(req.body.name||'').trim(),password=String(req.body.password||'');
    
    if(!username||!password)return res.status(400).json({error:'Username and password are required.'});
    
    if(password.length<6)return res.status(400).json({error:'Password must be at least 6 characters.'});
    
    const d=read();if(d.accounts.some(a=>a.username===username))return res.status(409).json({error:'That username is already taken.'});const h=hash(password),a={id:id('account'),username,name,passwordHash:h.passwordHash,passwordSalt:h.passwordSalt,profileImage:req.file?`/uploads/${req.file.filename}`:'',createdAt:new Date().toISOString(),'Plant Profiles':[],'Plant Protocols Scale':{level:1,notes:''},'Plant Panel Items':[]};
    
    d.accounts.push(a);write(d);req.session.accountId=a.id;res.status(201).json({message:'thank you for joining;',account:safe(a)})});
app.post('/api/auth/login',(req,res)=>{const username=String(req.body.username||'').trim().toLowerCase(),password=String(req.body.password||''),a=read().accounts.find(x=>x.username===username);
    
    if(!a)return res.status(401).json({error:'That username or password is not correct.'});
    
    const h=hash(password,a.passwordSalt);if(!crypto.timingSafeEqual(Buffer.from(h.passwordHash,'hex'),Buffer.from(a.passwordHash,'hex')))return res.status(401).json({error:'That username or password is not correct.'});req.session.accountId=a.id;res.json({message:'welcome back.',account:safe(a)})});
    
app.post('/api/auth/logout',(req,res)=>req.session.destroy(()=>res.json({message:'logged out'})));app.get('/api/auth/me',(req,res)=>{const a=me(req);a?res.json({account:safe(a)}):res.status(401).json({error:'Not logged in.'})});


app.post('/api/plants',auth,upload.array('images',12),(req,res)=>{const d=read(),a=d.accounts.find(x=>x.id===req.session.accountId),age=Math.max(0,parseInt(req.body.manuallyAddedAgeDays||'0',10)||0),imgs=(req.files||[]).map(f=>({id:id('image'),url:`/uploads/${f.filename}`,filename:f.originalname,addedAt:new Date().toISOString()})),p={id:id('plant'),name:String(req.body.name||'').trim(),speciesType:String(req.body.speciesType||'').trim(),description:String(req.body.description||'').trim(),manuallyAddedAgeDays:age,ageStartedAt:new Date().toISOString(),additionalSpecs:{color:String(req.body.color||'').trim(),size:String(req.body.size||'').trim(),other:String(req.body.otherSpecs||'').trim()},images:imgs,timeline:imgs.map(i=>({imageId:i.id,date:i.addedAt,note:'Image added'})),createdAt:new Date().toISOString()};if(!p.name)return res.status(400).json({error:'Plant name is required.'});a['Plant Profiles'].push(p);write(d);res.status(201).json({plant:p})});
app.get('/api/plants',auth,(req,res)=>res.json({plants:me(req)['Plant Profiles']}));

app.post('/api/panel',auth,(req,res)=>{const d=read(),a=d.accounts.find(x=>x.id===req.session.accountId),item={id:id('panel'),title:String(req.body.title||'').trim(),note:String(req.body.note||'').trim(),createdAt:new Date().toISOString()};

a['Plant Panel Items'].push(item);write(d);

res.status(201).json({item})});app.get('/api/panel',auth,(req,res)=>res.json({items:me(req)['Plant Panel Items']}));

app.get('/api/protocols',auth,(req,res)=>res.json({protocols:me(req)['Plant Protocols Scale']}));app.post('/api/protocols',auth,(req,res)=>{const d=read(),a=d.accounts.find(x=>x.id===req.session.accountId);a['Plant Protocols Scale']={level:Math.min(10,Math.max(1,Number(req.body.level)||1)),notes:String(req.body.notes||'').trim(),updatedAt:new Date().toISOString()};write(d);
    
    res.json({protocols:a['Plant Protocols Scale']})});
app.use('/uploads',express.static(uploads));const dist=path.join(root,'dist');if(fs.existsSync(dist)){app.use(express.static(dist));app.get('*',(req,res,next)=>req.path.startsWith('/api/')?next():res.sendFile(path.join(dist,'index.html')))}app.listen(Number(process.env.PORT)||3001,()=>console.log('plantist server running on port '+(process.env.PORT||3001)));
