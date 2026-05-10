import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getBackendUrl } from '../utils/backend';

const ImageUpload = ({ onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setSelectedFiles(event.target.files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return alert("Please select images.");

    setLoading(true);
    const formData = new FormData();

    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("images", selectedFiles[i]);
    }

    try {
      const response = await axios.post(`${getBackendUrl()}/api/upload-images`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Upload success:", response.data);
      onUploadSuccess(response.data.modelUrl); 
      
      // 🔄 Rediriger vers la page du modèle
      navigate("/viewer");
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <input type="file" multiple onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload Images"}
      </button>
    </div>
  );
};

export default ImageUpload;