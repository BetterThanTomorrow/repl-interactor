import * as express from 'express';
import * as compression from 'compression';

let app = express();
function shouldCompress (req, res) {
    if (req.headers['x-no-compression']) {
      // don't compress responses with this request header
      return false
    }

    if(req.path.match(".bin$"))
        return true;
  
    // fallback to standard filter function
    return compression.filter(req, res)
  }

app.use(compression({ filter: shouldCompress }))
app.get("/api/foo", (req, res) => {
  res.send("Fucking woot")
})
app.use(express.static(__dirname+"/../../www"));


app.listen(3001);