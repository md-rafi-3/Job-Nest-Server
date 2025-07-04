const express= require('express')
const cors=require('cors')
const app=express()
const jwt=require('jsonwebtoken')
const cookieParser=require("cookie-parser");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
//middleware
app.use(cors({
    origin:['http://localhost:5173'],
    credentials:true
}
));
app.use(express.json());
app.use(cookieParser())


const logger=(req,res,next)=>{
  console.log("inside the logger middleware")
  next();
}

const verifyToken=(req,res,next)=>{
  const token=req.cookies?.token;
  console.log("cookie in the middleware",token)
  if(!token){
    return res.status(401).send({message:"Unauthorize access"})
  }

  // veryfy token
  jwt.verify(token,process.env.JWT_ACCESS_SECRET,(error,decoded)=>{
    if(error){
      return res.status(401).send({message:"Unauthorize access"})
    }
    req.decoded=decoded;
    console.log(decoded)
  })
  // 
  next()
}





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cmpq8iw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();



    // jobs api
    const jobsCollections=client.db('Career-code').collection('jobs');
    const applicationsCollections=client.db('Career-code').collection('applications');


      // jwt token related api
    app.post("/jwt",async(req,res)=>{
      const {email}=req.body;
      const user={email}

      const token=jwt.sign(user,process.env.JWT_ACCESS_SECRET,{expiresIn:'1d'});

      // set token in the cookies
      res.cookie('token',token,{
        httpOnly: true,
        secure:false
      })
      res.send({success:true})
    })



    // app.get('/jobs',async(req,res)=>{
    //     const cursor=jobsCollections.find();
    //     const result=await cursor.toArray();
    //     res.send(result)
    // })



    app.post("/jobs",async(req,res)=>{
      const newJob=req.body;
      const result=await jobsCollections.insertOne(newJob);
      res.send(result)
    })

    app.get("/jobs/applications",async(req,res)=>{
      const email=req.query.email;
      const query={hr_email:email}
      const jobs=await jobsCollections.find(query).toArray();

      // should use aggregate to have optimal data fetching
      for(const job of jobs){
        const applicationQuery={jobId: job._id.toString()}
        const application_count=await applicationsCollections.countDocuments(applicationQuery)
        job.application_count=application_count;

      }

      res.send(jobs)
    })


    app.get("/jobs/:id",async(req,res)=>{
        const id=req.params.id;
        const query={_id: new ObjectId(id)};
        const result=await jobsCollections.findOne(query);
        res.send(result)
    })

    // could not be done
    // app.get("/jobsByEmail",async(req,res)=>{
    //   const email=req.query;
    //   const query={hr_email:email}
    //   const result=await jobsCollections.find(query).toArray();
    //   res.send(result)
    // })

    app.get("/jobs",async(req,res)=>{
      const email=req.query.email;
      const query={}
      if(email){
        query.hr_email=email;
      }
      const cursor=jobsCollections.find(query);
      const result=await cursor.toArray()
      res.send(result)
    })

  


    // job application api

    app.post("/applications",async(req,res)=>{
      const application=req.body;
      console.log(application)
      const result=await applicationsCollections.insertOne(application);
      res.send(result)
    })



    

    app.get("/applications/job/:job_id",async(req,res)=>{
      const job_id=req.params.job_id;
      console.log(job_id)
      const query={jobId: job_id};
      const result=await applicationsCollections.find(query).toArray();
      res.send(result)
    })


    app.patch("/applications/:id",async(req,res)=>{
      const id=req.params.id;
      const updated=req.body;
      console.log(id,updated)
      const filter={_id: new ObjectId(id)};
      const updatedDoc={
        $set:{
          status:updated.status
        }
      }
      const result=await applicationsCollections.updateOne(filter,updatedDoc);
      res.send(result)
    })

    
    

    app.get("/applications",logger,verifyToken, async(req,res)=>{
      const email=req.query.email;

      console.log("inside application api",req.cookies)
      if(email !==req.decoded.email){
        return res.status(401).send({message:"Unauthorize access"})
      }
      const query={
        email:email
      }
      const result=await applicationsCollections.find(query).toArray();
      

      // bad way
      for(const application of result){
        const jobId=application.jobId;
        const jobQuery={_id: new ObjectId(jobId)}
        const job=await jobsCollections.findOne(jobQuery);
        application.company=job.company;
        application.title=job.title;
        application.company_logo=job.company_logo
      }
      
      res.send(result)
    })


    




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send("Career code is cooking")
})

app.listen(port,()=>{
    console.log(`career code server is running in port ${port}`)
})