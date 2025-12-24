import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  const normalize = (value) => {
    if (typeof value !== 'string') return value;
    // Common .env copy/paste issues: trailing spaces or wrapping quotes.
    return value.trim().replace(/^['"]|['"]$/g, '');
  };

  cloudinary.config({
    cloud_name: normalize(process.env.CLOUDINARY_CLOUD_NAME),
    api_key: normalize(process.env.CLOUDINARY_API_KEY),
    api_secret: normalize(process.env.CLOUDINARY_API_SECRET),
    secure: true
  });
};

export default configureCloudinary;
export { cloudinary };
