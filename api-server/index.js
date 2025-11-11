require('dotenv').config();
const { generateSlug } = require('random-word-slugs');
const {
   ECSClient,
   RunTaskCommand,
   DescribeTasksCommand,
} = require('@aws-sdk/client-ecs');
const express = require('express');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const PORT = 9000;

const app = express();
app.use(express.json());

const subscriber = new Redis('redis://localhost:6379');

const io = new Server({ cors: '*' });

io.listen(9001, () => console.log('Socket running'));

io.on('connection', (socket) => {
   socket.on('subscribe', (channel) => {
      socket.join(channel);
      socket.emit('message', `Joined ${channel}`);
   });
});

const ecsClient = new ECSClient({
   region: 'us-east-1',
   credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID,
      secretAccessKey: process.env.ACCESS_KEY_SECRET,
   },
});

const config = {
   CLUSTER: process.env.CLUSTER,
   TASK: process.env.TASK,
};

app.post('/project', async (req, res) => {
   const { gitUrl, projectSlug: providedProjectSlug } = req.body;
   const projectSlug = providedProjectSlug || generateSlug();

   // run an ecs task
   const command = new RunTaskCommand({
      cluster: config.CLUSTER,
      taskDefinition: config.TASK,
      launchType: 'FARGATE',
      count: 1,
      networkConfiguration: {
         awsvpcConfiguration: {
            assignPublicIp: 'ENABLED',
            subnets: ['subnet-0b105d9e459ba3447'],
            securityGroups: ['sg-0b93f1f2f1c92f3a9'],
         },
      },
      overrides: {
         containerOverrides: [
            {
               name: 'builder-image',
               environment: [
                  {
                     name: 'GIT_REPOSITORY_URL',
                     value: gitUrl,
                  },
                  {
                     name: 'PROJECT_ID',
                     value: projectSlug,
                  },
                  {
                     name: 'ACCESS_KEY_ID',
                     value: process.env.ACCESS_KEY_ID,
                  },
                  {
                     name: 'ACCESS_KEY_SECRET',
                     value: process.env.ACCESS_KEY_SECRET,
                  },
               ],
            },
         ],
      },
   });
   const response = await ecsClient.send(command);

   res.json({
      status: 'queued',
      data: {
         projectSlug,
         url: `${projectSlug}.localhost:8000`,
         arn: response.tasks[0].taskArn,
      },
   });
});

app.get('/status', async (req, res) => {
   const { task_arn } = req.query;
   const describeCommand = new DescribeTasksCommand({
      cluster: config.CLUSTER,
      tasks: [task_arn],
   });
   const result = await ecsClient.send(describeCommand);
   res.json({
      status: result.tasks[0].lastStatus,
   });
});

function initRedis() {
   subscriber.psubscribe('logs:*');
   subscriber.on('pmessage', (pattern, channel, message) => {
      io.to(channel).emit('message', message);
   });
}

initRedis();

app.listen(PORT, () => console.log(`API Server running on ${PORT}`));
