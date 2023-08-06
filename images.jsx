import React, { useState } from "react";
import useSWR from "swr";
import fetcher from "../libs/fetcher";
import axios from "axios";
import { useUserContext } from "../context/UserContext";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../firebase";

const cloudinary_root_url =
  "https://res.cloudinary.com/foldername/image/upload/";

export default function Images() {
  const { userData } = useUserContext();

  const { data, error, isLoading } = useSWR("/api/images", fetcher);
  // const [imageUrl, setImageUrl] = useState([]);
  const article = data?.data;
  if (error) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  // upload images to firestore
  console.log("article", article);

  const handleImagesUpload = async () => {
    // Check if any files were selected

    article?.slice()?.forEach(async (acceptedFile, index) => {
      const articleImage = cloudinary_root_url.concat(
        acceptedFile.articleCoverImage
      );
      const response = await axios.get(articleImage, { responseType: "blob" });
       const imageBlob = response.data;
      // setImageUrl((prevImages) => [...prevImages, imageBlob]);

      const storageRef = ref(
        storage,
        `/foldername/${userData.data._id}/${acceptedFile._id}`
      );
      const uploadTask = uploadBytesResumable(storageRef, imageBlob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
          const progress =
            Math.round(snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          // setUploadProgress(progress);
          switch (snapshot.state) {
            case "paused":
              // console.log("Upload is paused");
              break;
            case "running":
              // console.log("Upload is running");
              break;
          }
        },
        (error) => {
          // Handle upload error
          switch (error.code) {
            case "storage/unauthorized":
              // User doesn't have permission to access the object
              ToastifyFailure("You are not authorized!");
              break;
            case "storage/canceled":
              // User canceled the upload
              ToastifyFailure("You canceled the uploading!");
              break;
            case "storage/unknown":
              // Unknown error occurred, inspect error.serverResponse
              ToastifyFailure("Something went wrong with the upload!");
              break;
            default:
              ToastifyFailure("An error occurred during upload!");
          }
        },
        () => {
          // Upload completed successfully, now we can get the download URL
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            // Update user image for each uploaded file

            if (downloadURL) {
              console.log("downloadURL", downloadURL);
              try {
                const data = {
                  articleCoverImage: downloadURL,
                };
                const options = {
                  method: "PATCH",
                  url: `${process.env.NEXT_PUBLIC_ROOT_URL}/api/products/${acceptedFile._id}`,
                  headers: {
                    "content-type": "application/json",
                  },
                  data: JSON.stringify(data),
                };

                axios(options)
                  .then((res) => {
                    console.log("res", res);

                    if (res?.status == 200) {
                      ToastifySuccess(`"Image ${index} Updated successfully"`);
                      return;
                    }
                  })
                  .catch((error) => {
                    console.error("Something went wrong!");
                    return;
                  });
              } catch (error) {
                console.error("Something went wrong!");
                return;
              }
            }
          });
        }
      );
    });
  };

  return (
    <div className="p-10">
      <img src={` `} alt="" className="w-20 h-20 object-contain" />
      <br />
      <button onClick={handleImagesUpload} className="btn">
        Upload
      </button>
    </div>
  );
}
