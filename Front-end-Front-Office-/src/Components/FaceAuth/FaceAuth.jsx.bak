/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState, useContext } from "react";
import * as faceapi from "face-api.js";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./FaceAuth.css";
import { AuthContext } from "../../AuthContext";

const FaceAuth = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const containerRef = useRef(null);
  const intervalRef = useRef(null);
  const navigate = useNavigate();

  // Safely access the AuthContext with fallback
  const authContext = useContext(AuthContext) || {};
  const login =
    authContext.login ||
    ((token) => {
      console.log(
        "Using fallback login function since AuthContext.login is not available"
      );
      localStorage.setItem("jwt", token);
    });

  // Increase tolerance - higher value means more lenient matching
  const FACE_MATCH_THRESHOLD = 0.6;

  useEffect(() => {
    const loadModelsAndStartWebcam = async () => {
      try {
        setLoading(true);
        setStatus("Loading face recognition models...");

        // Load models from your public folder
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
          faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        ]);
        console.log("Face API models loaded successfully");
        setStatus("Starting webcam...");
        startWebcam();
      } catch (err) {
        console.error("Error loading face-api models:", err);
        setError(
          "Failed to load face recognition models. Please try again later."
        );
        setLoading(false);
      }
    };

    loadModelsAndStartWebcam();

    // Cleanup function to stop webcam when component unmounts
    return () => {
      stopWebcam();
    };
  }, []);

  // Function to stop webcam and clear intervals
  const stopWebcam = () => {
    console.log("Stopping webcam and clearing intervals");
    // Clear the face detection interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop all video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => {
        track.stop();
        console.log("Video track stopped");
      });
      videoRef.current.srcObject = null;
    }
  };

  const startWebcam = () => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setLoading(false);
            setStatus("Webcam active, looking for faces...");
          };
        }
      })
      .catch((err) => {
        console.error("Error accessing webcam:", err);
        setError(
          "Could not access webcam. Please make sure you have granted permission to use your camera."
        );
        setLoading(false);
      });
  };

  useEffect(() => {
    if (videoRef.current && !loading && !error) {
      videoRef.current.addEventListener("play", handleVideoPlay);
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("play", handleVideoPlay);
      }
    };
  }, [loading, error]);

  const getLabeledFaceDescriptions = async () => {
    try {
      setStatus("Fetching registered user faces...");
      // Fetch users from your backend API
      const response = await fetch("http://localhost:3001/User/users/");
      if (!response.ok) {
        throw new Error(
          `Failed to fetch users: ${response.status} ${response.statusText}`
        );
      }

      const users = await response.json();
      console.log(`Fetched ${users.length} users for face recognition`);

      // Filter out users without valid image URLs
      const usersWithImages = users.filter(
        (user) => user.image && !user.image.includes("profile-user-icon")
      );
      console.log(
        `Found ${usersWithImages.length} users with custom profile images`
      );

      if (usersWithImages.length === 0) {
        setStatus("No users with valid profile images found!");
        return [];
      }

      setStatus(`Processing ${usersWithImages.length} user faces...`);

      const labeledDescriptors = await Promise.all(
        usersWithImages.map(async (user) => {
          const descriptions = [];
          try {
            // Log the image URL for debugging
            console.log(
              `Processing image for user ${user.name}: ${user.image}`
            );

            // Use the image URL from the user object
            const img = await faceapi.fetchImage(user.image);
            console.log(
              `Image loaded for ${user.name}, dimensions: ${img.width}x${img.height}`
            );

            // Detect face with more detailed logging
            const detections = await faceapi
              .detectSingleFace(img)
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detections) {
              descriptions.push(detections.descriptor);
              console.log(
                `Face descriptor created for ${user.name} - Score: ${detections.detection.score}`
              );
            } else {
              console.warn(
                `No face detected in image for ${user.name}. Check the image quality.`
              );
            }
          } catch (error) {
            console.error(`Error loading image for ${user.name}:`, error);
          }

          // Only create labeled descriptors if we have valid descriptions
          if (descriptions.length > 0) {
            return new faceapi.LabeledFaceDescriptors(
              `${user.name}:${user._id}`,
              descriptions
            );
          }
          return null;
        })
      );

      // Filter out null entries
      const validDescriptors = labeledDescriptors.filter(
        (desc) => desc !== null
      );

      console.log(
        `Created ${validDescriptors.length} valid face descriptors out of ${usersWithImages.length} users`
      );
      setStatus(`Ready with ${validDescriptors.length} face profiles`);

      return validDescriptors;
    } catch (error) {
      console.error("Error fetching users for face recognition:", error);
      setStatus("Error fetching user data");
      return [];
    }
  };

  // Function to handle successful authentication
  const handleSuccessfulAuth = (token, userData) => {
    try {
      console.log("Authentication successful, storing token and user data");

      // Make sure webcam is stopped before proceeding with navigation
      stopWebcam();

      // Decode the token to get role information
      const decodedToken = jwtDecode(token);
      console.log("Decoded token:", decodedToken);

      // Use the login function from context or fallback
      login(token);

      // Show success message with toast
      toast.success("Face recognition successful!", {
        position: "top-right",
        autoClose: 3000,
        onClose: () => {
          // Only redirect after toast is closed and webcam is stopped
          console.log("Toast closed, proceeding with redirect");
          if (decodedToken.role === "Admin") {
            window.location.href = "http://localhost:5173/";
          } else {
            // Navigate to home/profile page for regular users
            navigate("/");
          }
        },
      });
    } catch (error) {
      console.error("Error processing authentication:", error);
      toast.error("Authentication failed. Please try again.");
      setLoading(false);
      startWebcam(); // Restart webcam if there was an error
    }
  };

  const handleVideoPlay = async () => {
    if (!videoRef.current || !containerRef.current) return;

    try {
      // Create canvas if it doesn't exist
      if (!canvasRef.current) {
        const canvas = faceapi.createCanvasFromMedia(videoRef.current);
        canvas.id = "face-detection-canvas";
        canvasRef.current = canvas;
        containerRef.current.appendChild(canvas);
      }

      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      faceapi.matchDimensions(canvasRef.current, displaySize);

      const labeledFaceDescriptors = await getLabeledFaceDescriptions();
      console.log("Labeled Face Descriptors Loaded:", labeledFaceDescriptors);

      if (labeledFaceDescriptors.length === 0) {
        console.warn("No face descriptors loaded. Skipping recognition.");
        setError(
          "No registered faces found in the system. Recognition will be limited."
        );

        intervalRef.current = setInterval(async () => {
          if (!videoRef.current || !canvasRef.current) {
            clearInterval(intervalRef.current);
            return;
          }

          const detections = await faceapi
            .detectAllFaces(videoRef.current)
            .withFaceLandmarks();

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );

          canvasRef.current
            .getContext("2d")
            .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

          if (detections.length > 0) {
            setStatus(
              `Face detected, but no registered users to match against`
            );
          } else {
            setStatus(`No faces detected in frame`);
          }
        }, 1000);

        return;
      }

      const faceMatcher = new faceapi.FaceMatcher(
        labeledFaceDescriptors,
        FACE_MATCH_THRESHOLD
      );
      console.log(
        `Face matcher created with threshold: ${FACE_MATCH_THRESHOLD}`
      );

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) {
          clearInterval(intervalRef.current);
          return;
        }

        try {
          setStatus("Scanning for faces...");
          const detections = await faceapi
            .detectAllFaces(videoRef.current)
            .withFaceLandmarks()
            .withFaceDescriptors();

          if (detections.length === 0) {
            setStatus(
              "No faces detected. Position yourself in front of the camera."
            );
          } else {
            setStatus(
              `Detected ${detections.length} faces in frame, attempting recognition...`
            );
          }

          const resizedDetections = faceapi.resizeResults(
            detections,
            displaySize
          );

          canvasRef.current
            .getContext("2d")
            .clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          let recognizedUser = null;

          resizedDetections.forEach((detection) => {
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
            console.log(
              "Best Match:",
              bestMatch.toString(),
              "Distance:",
              bestMatch.distance
            );

            const box = detection.detection.box;

            if (bestMatch.distance <= FACE_MATCH_THRESHOLD) {
              const [name, userId] = bestMatch.label.split(":");
              recognizedUser = { name, userId };

              const drawBox = new faceapi.draw.DrawBox(box, {
                label: `${name} (${Math.round(
                  (1 - bestMatch.distance) * 100
                )}%)`,
                boxColor: "green",
                lineWidth: 2,
              });
              drawBox.draw(canvasRef.current);

              setStatus(
                `Recognized: ${name} (${Math.round(
                  (1 - bestMatch.distance) * 100
                )}% match)`
              );
            } else {
              const drawBox = new faceapi.draw.DrawBox(box, {
                label: "Unknown",
                boxColor: "red",
                lineWidth: 2,
              });
              drawBox.draw(canvasRef.current);

              setStatus(
                `Face detected but not recognized (best match: ${Math.round(
                  (1 - bestMatch.distance) * 100
                )}%)`
              );
            }
          });

          if (recognizedUser) {
            console.log(
              `User recognized: ${recognizedUser.name} (${recognizedUser.userId})`
            );
            setStatus(
              `User recognized! Authenticating as ${recognizedUser.name}...`
            );

            try {
              // Stop the webcam and interval before getting token
              clearInterval(intervalRef.current);
              intervalRef.current = null;

              // Update UI to show authentication is in progress
              setLoading(true);

              const response = await fetch(
                "http://localhost:3001/auth/getToken",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    userId: recognizedUser.userId,
                  }),
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to get JWT: ${response.statusText}`);
              }

              const data = await response.json();

              if (data.token) {
                console.log(
                  "Token received from server:",
                  data.token.substring(0, 20) + "..."
                );

                // Get user data if needed
                let userData = null;
                try {
                  const userResponse = await fetch(
                    `http://localhost:3001/User/users/${recognizedUser.userId}`,
                    {
                      headers: {
                        Authorization: `Bearer ${data.token}`,
                      },
                    }
                  );

                  if (userResponse.ok) {
                    userData = await userResponse.json();
                    console.log("User data retrieved:", userData);
                  }
                } catch (userErr) {
                  console.warn(
                    "Could not fetch additional user data:",
                    userErr
                  );
                  // Continue anyway, we have the token
                }

                // Handle the successful authentication
                handleSuccessfulAuth(data.token, userData);
              } else {
                console.error("No token received from the server.");
                setError("Authentication failed. Please try again.");
                setLoading(false);
                // Restart webcam if authentication failed
                startWebcam();
              }
            } catch (error) {
              console.error("Error fetching JWT:", error);
              setError("Authentication failed. Please try again.");
              setLoading(false);
              // Restart webcam if there was an error
              startWebcam();
            }
          }
        } catch (detectionError) {
          console.error("Error during face detection:", detectionError);
          setStatus("Error during face detection. Retrying...");
        }
      }, 1000);
    } catch (error) {
      console.error("Error in face recognition setup:", error);
      setError(
        "An error occurred during face recognition setup. Please try again later."
      );
    }
  };

  // Add a cleanup function for component unmounting
  useEffect(() => {
    return () => {
      console.log("Component unmounting - ensuring webcam is stopped");
      stopWebcam();
    };
  }, []);

  return (
    <div className="face-auth-container">
      <h2>Face Recognition Login</h2>
      <p>Look at the camera to authenticate</p>

      {loading && (
        <div className="loading">Loading face recognition system...</div>
      )}

      {error && <div className="error-message">{error}</div>}

      {status && <div className="status-message">{status}</div>}

      <div className="video-container" ref={containerRef}>
        <video ref={videoRef} autoPlay playsInline muted id="face-auth-video" />
      </div>

      <div className="check-login-status mt-4">
        <button
          onClick={() => {
            const token = localStorage.getItem("jwt");
            if (token) {
              alert("JWT Token exists: " + token.substring(0, 20) + "...");
            } else {
              alert("No JWT Token found in localStorage");
            }
          }}
          className="login-debug-button"
        >
          Check Login Status
        </button>
      </div>

      <div className="back-to-login">
        <button onClick={() => navigate("/login")}>
          Back to traditional login
        </button>
      </div>

      <ToastContainer />
    </div>
  );
};

export default FaceAuth;
