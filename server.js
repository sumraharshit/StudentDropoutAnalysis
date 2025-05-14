require('dotenv').config(); 
const { GoogleGenerativeAI } = require('@google/generative-ai'); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



const express = require('express');
const app = express();
const port = process.env.port || 4000;
const {pool} = require("./dbConfig");
const bcrypt = require('bcrypt');
const session = require("express-session");
const flash = require("express-flash");
const passport = require("passport");

const initializePassport = require("./passport");

initializePassport(passport);


app.set('view engine', 'ejs');

app.use(express.urlencoded({extended:true}));
app.use(express.json());





app.use(session({
    secret: "qwerty", //key which will encypt the data we wstore in our session, the loger harder the better.
    resave: false,    ///iff there is not nay change in the session data then it will not be ressaved, improves performnce and avoid unnecsary storage
    saveUninitialised: false //if user just visits then new session is created for it but user does not do anyhthing eith site and leaves in that case we dont want to save that session
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get('/',(req,res)=>{
res.render("index");
});

app.get("/user/register",checkAuthenticated,(req,res)=>{
    res.render("register");
});

app.get("/user/login",checkAuthenticated,(req,res)=>{
    res.render("login");
});

app.get("/user/dashboard", checkNotAuthenticated,(req,res)=>{
    res.render("dashboard",{
        user: req.user.name
    });
});

// Keep all your existing routes
app.get("/user/first", (req, res) => { res.render("first"); });
// ... (all other app.get routes for second, third, etc.)
app.get("/second", (req, res) => { res.render("second"); });
app.get("/third", (req, res) => { res.render("third"); });
app.get("/fourth", (req, res) => { res.render("fourth"); });
app.get("/fifth", (req, res) => { res.render("fifth"); });
app.get("/sixth", (req, res) => { res.render("sixth"); });
app.get("/seventh", (req, res) => { res.render("seventh"); });
app.get("/eighth", (req, res) => { res.render("eighth"); });
app.get("/ninth", (req, res) => { res.render("ninth"); });
app.get("/tenth", (req, res) => { res.render("tenth"); });
app.get("/result", (req, res) => { res.render("result"); });
app.get("/result1", (req, res) => { res.render("result1"); });


app.get("/user/logout", (req,res)=>{
    // Note: req.logOut might require a callback depending on Passport.js version
    req.logOut(function(err) {
        if (err) { return next(err); }
        req.flash("success_msg","You have logged out");
        res.redirect("/user/login");
      });

});

app.post("/user/register", async (req,res)=>{
    let {name,email,password,password2} = req.body;
    console.log({
        name,email,password,password2
    });

    let errors = [];

    if(!name || !email || !password || !password2)
    errors.push({message: "Please Fill The All Fields"});

    if(password.length<6)
    {
        errors.push({message: "Password should be atleast 6 character long"});
    }

    if(password !== password2)
    errors.push({message: "Passwords do not match"});

    if(errors.length>0)
    {
        res.render("register",{errors});
    }else{
        let hashedPassword = await bcrypt.hash(password,10);
        console.log(hashedPassword);

        pool.query(
            `SELECT * FROM users
            WHERE email = $1`, [email], (err,results)=>{
                if(err)
                {throw err;}

                console.log(results.rows);
                if(results.rows.length>0){
                    errors.push({message:"Email Already Registered"});
                    res.render("register",{errors});
                }
                else{
                    pool.query(`INSERT INTO users (name,email,password)
                    VALUES ($1,$2,$3)
                    RETURNING id,password`, [name,email,hashedPassword],(err,results)=>{
                        if(err)
                        throw err;
                        console.log(results.rows);
                        req.flash("success_msg","You are Now Regsitered. Please Log In");
                        res.redirect("/user/login");
                    })
                }
            }
        );
    }

    //form validation is complete
});

app.post("/user/login", passport.authenticate("local",{
    successRedirect: "/user/dashboard",
    failureRedirect: "/user/login",
    failureFlash: true
}));

function checkAuthenticated(req,res,next)
{
    if(req.isAuthenticated())
    {
        return res.redirect("/user/dashboard");
    }

    next();
}

function checkNotAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }

    res.redirect("/user/login");
}

 
app.post('/api/generate-report', async (req, res) => {
    try {
        
        const answers = req.body.answers;
        console.log("Received answers on backend:", answers);

        
        if (!answers || Object.keys(answers).length === 0) {
            console.error('Backend received empty or missing answers object.');
            return res.status(400).json({ error: 'No answers provided.' });
        }

       
        const expectedKeys = Array.from({ length: 20 }, (_, i) => `q${i + 1}`);
        const missingKeys = expectedKeys.filter(key => !(key in answers));
        if (missingKeys.length > 0) {
            console.warn(`Backend missing answer keys: ${missingKeys.join(', ')}`);
           
        }

       
        const prompt = Object.entries(answers)
          .map(([k,v]) => `${k.toUpperCase()}: ${v || 'Not Answered'}`) // Handle potentially missing answers gracefully
          .join('\n');

        const fullPrompt = `
You are an educational analyst. Given these student questionnaire answers:
${prompt}

Write a concise, one‑page personalized dropout‑risk report that includes:
 • A summary of the student’s risk factors
 • Actionable recommendations
 • An encouraging closing paragraph.
 Plus it should not have date and name of student.
        `.trim();

        console.log("Sending prompt to Gemini:\n", fullPrompt); // Log the prompt

        // --- Call Gemini API ---
        // Choose a model, e.g., 'gemini-1.5-flash-latest' or 'gemini-1.0-pro'
        // 'gemini-1.5-flash-latest' is generally faster and cheaper
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        // Call the generateContent method
        const result = await model.generateContent(fullPrompt);
        const response = await result.response; // Get the response object

        // Extract the report text
        const reportText = response.text();

        if (!reportText) {
            console.error('Gemini response did not contain expected content.', response);
            throw new Error('Failed to extract report text from Gemini response.');
        }

        console.log("Generated report:", reportText); // Log before sending

        // Send the report back to the client
        res.json({ reportText });

    } catch (err) {
        console.error('Error in /api/generate-report:', err);
        // Provide more detailed error logging for Gemini errors if possible
        // The error structure might vary; logging the whole error object can help
        console.error('Error details:', err);
        res.status(500).json({ error: 'Report generation failed.', details: err.message || 'Unknown server error' });
    }
});


app.listen(port,()=>{
    console.log(`Listening to port ${port}`);
});


function checkAuthenticated(req,res,next)
{
    if(req.isAuthenticated())
    {
        return res.redirect("/user/dashboard");
    }

    next();
}

function checkNotAuthenticated(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }

    res.redirect("/user/login");
}