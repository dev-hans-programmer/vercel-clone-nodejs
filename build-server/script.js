const path = require('path');
const { exec } = require('child_process');
const fs = require('fs/promises');

async function init() {
   console.log('Executing script.js');

   const outputDir = path.join(__dirname, 'output');

   const p = exec(`cd ${outputDir} && npm install & npm run build`);

   p.stdout.on('data', (data) => {
      console.log(`LOG:${data.toString()}`);
   });

   p.stdout.on('error', (data) => {
      console.log(`ERROR:${data.toString()}`);
   });

   p.on('close', async function () {
      console.log('Build Complete');
      const distFolderPath = path.join(__dirname, 'output', 'dist');
      const distFolderContent = fs.readdir(distFolderPath, { recursive: true });

      for (const filePath of distFolderContent) {
         const fullPath = path.join(distFolderPath, filePath);

         const stat = await fs.lstat(fullPath);

         if (stat.isDirectory()) {
            continue;
         } else {
            // upload to S3
         }
      }
   });
}

async function testFolderContent() {
   const folderPath = path.join(__dirname, 'test');
   const contents = await fs.readdir(folderPath, { recursive: true });
   console.log(contents);
   for (const content of contents) {
      const fullPath = path.join(folderPath, content);

      const stat = await fs.lstat(fullPath);

      if (stat.isDirectory()) {
         console.log(`Directory:${fullPath}`);
      }
   }
}
testFolderContent();
