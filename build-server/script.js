require('dotenv').config();
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { exec } = require('child_process');
const fs = require('fs/promises');
const fsSync = require('fs');
const mime = require('mime-types');

const s3CLient = new S3Client({
   region: 'us-east-1',
   credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.ACCESS_KEY_SECRET,
   },
});

const PROJECT_ID = process.env.PROJECT_ID || 'test_project';
async function init() {
   console.log('Executing script.js');

   const outputDir = path.join(__dirname, 'output');

   const p = exec(`cd ${outputDir} && npm install && npm run build`);

   p.stdout.on('data', (data) => {
      console.log(`LOG:${data.toString()}`);
   });

   p.stdout.on('error', (data) => {
      console.log(`ERROR:${data.toString()}`);
   });

   p.on('close', async function () {
      console.log('Build Complete');
      const distFolderPath = path.join(__dirname, 'output', 'dist');
      const distFolderContent = await fs.readdir(distFolderPath, {
         recursive: true,
      });
      console.log({ distFolderPath, distFolderContent });
      for (const filePath of distFolderContent) {
         const fullPath = path.join(distFolderPath, filePath);
         console.log(filePath);

         const stat = await fs.lstat(fullPath);

         if (stat.isDirectory()) continue;

         // upload to S3
         const command = new PutObjectCommand({
            Bucket: 'vercel-nodejs',
            Key: `__output/${PROJECT_ID}/${filePath}`,
            Body: fsSync.createReadStream(fullPath),
            ContentType: mime.lookup(fullPath),
         });
         await s3CLient.send(command);
         console.log(`Uploaded ${filePath}`);
      }
      console.log('Done...');
   });
}

async function testFolderContent() {
   const folderPath = path.join(__dirname, 'test');
   const contents = await fs.readdir(folderPath, { recursive: true });
   for (const content of contents) {
      const fullPath = path.join(folderPath, content);

      const stat = await fs.lstat(fullPath);

      if (stat.isDirectory()) continue;
      const command = new PutObjectCommand({
         Bucket: 'vercel-nodejs',
         Key: `__output/${PROJECT_ID}/${content}`,
         Body: fsSync.createReadStream(fullPath),
         ContentType: mime.lookup(fullPath),
      });
      await s3CLient.send(command);
   }
}
// testFolderContent();
init();
