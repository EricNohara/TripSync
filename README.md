# TripSync - Trip Photo Sharing Application

## https://tripsync-zh42.onrender.com/

### Technology Stack:

- Backend powered by Node.js using Express
- MongoDB
- Handlebars templating engine for server-side rendering
- AWS (S3) for cloud storage of images

### Functionality

- User login and registration using JWT sessions for authentication
- 2 factor authentication for user resetting forgotten password using SMTP
- Folder and image file creation and storage in AWS S3 Bucket
- Folder sharing with other public users
- Hand rolled share request and notification system for users sharing folders
- User edit settings, folder edit settings, image file edit settings
- File sorting
- Image compression before storage
- Uptime Robot used as a temporary solution to keep free render instance spun up and ready for incoming requests

### Important notes

- For pricing reasons, I am using AWS free tier storage, allowing up to 5GB cloud storage for free. If you happen to test out the site, please do not upload a very large number of photos, and when you are done, please delete your account to free up space!
- Uploaded images are first compressed and converted to webp format (for pricing reasons). Do not use as a true file storage application like Google Drive, as your photos will lose quality.
- Since I am hosting this web application on the free tier of render, there may be significant performance issues, especially when far away from the West-Ohio region. This is because the free tier offers only 0.1 CPU usage, spins down render instances during inactivity, and may restart the instance without notice. This is not due to errors on the application. If this were more of a formal project rather than educational, I would host the app directly with AWS.
