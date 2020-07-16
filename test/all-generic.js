const chai      = require('chai');
const chaiHTTP  = require('chai-http');
const jwt       = require('jsonwebtoken');
const fs        = require('fs');

const expect = chai.expect;
chai.use(chaiHTTP);


const jwtSecret = "--default-jwt-secret--";

const token = 'Bearer ' + jwt.sign({ roles: ['admin'] }, jwtSecret);

/**********************************************
  Generic HTTP requests based on chai HTTP
*/
async function get(port, collection) {
  return chai.request('http://localhost:' + port)
    .get(`/${collection}`)
    .set('Authorization', token);
}

async function getId(port, collection, id) {
  return chai.request('http://localhost:' + port)
    .get(`/${collection}/` + id)
    .set('Authorization', token);
}

async function query(port, collection, query) {
  return chai.request('http://localhost:' + port)
    .get(`/${collection}`)
    .query(query)
    .set('Authorization', token);
}

async function post(port, collection, data) {
  return chai.request('http://localhost:' + port)
    .post(`/${collection}`)
    .set('Authorization', token)
    .send(data);
}

async function put(port, collection, id, data) {
  return chai.request('http://localhost:' + port)
    .put(`/${collection}/` + id)
    .set('Authorization', token)
    .send(data);
}

async function patch(port, collection, id, data) {
  return chai.request('http://localhost:' + port)
    .patch(`/${collection}/` + id)
    .set('Authorization', token)
    .send(data);
}

async function erase(port, collection, id) {
  return chai.request('http://localhost:' + port)
    .delete(`/${collection}/` + id)
    .set('Authorization', token);
}

async function options(port, collection) {
  return chai.request('http://localhost:' + port)
    .options(`/${collection}`)
    .set('Authorization', token);
}

async function postFile(port, collection, filePath, fileName, fileField = 'file', fileType = false) {
  let r =  chai.request('http://localhost:' + port)
    .post(`/${collection}/`)
    .set('Authorization', token);

  if(fileType) {
    r = r.set('Content-Type', fileType);
  }

  r = r.attach(fileField, filePath, fileName);

  return r;
}

async function getBinary(port, collection, id) {
  return chai.request('http://localhost:' + port)
    .get(`/${collection}/${id}/binary`)
    .set('Authorization', token);
}


/**********************************************
  Testsuite
*/

async function defaultTestSuite(defaultsServerPort) {
  describe('Uploads library test suite', async function() {
    describe('Default options', async function() {
      it('Should send file to server', async function() {
        const response = await postFile(defaultsServerPort, 'uploads', './testfile.pdf', 'testfile.pdf');

        expect(response).to.have.status(200);
        this.fileId = response.body.id;
        this.storageName = response.body.storageName;
      });

      it('Should retrieve file information', async function() {
        const response = await getId(defaultsServerPort, 'uploads', this.fileId);

        expect(response).to.have.status(200);
        expect(response.body.id).to.equal(this.fileId);
        expect(response.body.storageName).to.equal(this.storageName);
        expect(response.body.name).to.equal('testfile.pdf');
      })

      it('Should retrieve binary', async function() {
        const response = await getBinary(defaultsServerPort, 'uploads', this.fileId);

        expect(response).to.have.status(200);
      });

      it('Should delete file', async function() {
        let response = await erase(defaultsServerPort, 'uploads', this.fileId);

        expect(response).to.have.status(200);

        response = await getId(defaultsServerPort, 'uploads', this.fileId);

        expect(response).to.have.status(404);
      })
    });
  });
};

async function testSuiteWithOptions(optionsServerPort) {
  describe('Uploads library test suite', async function() {
    describe('Custom options', async function() {
      it('Should send file to server', async function() {
        const response = await postFile(optionsServerPort, 'apiName', './testfile.pdf', 'testfile.pdf', 'uploadfilefield');

        expect(response).to.have.status(200);
        this.fileId = response.body.id;
        this.storageName = response.body.storageName;
      });

      it('Should reject unknown file types', async function() {
        const response = await postFile(optionsServerPort, 'apiName', './testfile.bin', 'testfile.bin', 'uploadfilefield');

        expect(response).to.have.status(415);
      });

      it('Should reject large files', async function() {
        const response = await postFile(optionsServerPort, 'apiName', './testfile2.pdf', 'testfile2.pdf', 'uploadfilefield');

        expect(response).to.have.status(413);
      });


      it('Should retrieve file information', async function() {
        const response = await getId(optionsServerPort, 'apiName', this.fileId);

        expect(response).to.have.status(200);
        expect(response.body.id).to.equal(this.fileId);
        expect(response.body.storageName).to.equal(this.storageName);
        expect(response.body.name).to.equal('testfile.pdf');
      })

      it('Should retrieve binary', async function() {
        const response = await getBinary(optionsServerPort, 'apiName', this.fileId);

        expect(response).to.have.status(200);
      });

      it('Should delete file', async function() {
        let response = await erase(optionsServerPort, 'apiName', this.fileId);

        expect(response).to.have.status(200);

        response = await getId(optionsServerPort, 'apiName', this.fileId);

        expect(response).to.have.status(404);
      })
    });
  });
}


module.exports = {
  defaultTestSuite,
  testSuiteWithOptions,
  jwtSecret
}
