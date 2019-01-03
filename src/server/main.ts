import * as express from 'express';
import * as compression from 'compression';

let app = express();

app.use(compression({
  filter: (req, res) =>
            (req.headers['x-no-compression'] ? false : compression.filter(req, res))}))

app.use(express.static(__dirname+"/../../www"));


app.listen(3001);