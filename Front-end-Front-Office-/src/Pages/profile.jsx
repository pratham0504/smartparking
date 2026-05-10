import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Select from "react-select";

const vehicleOptions = [
  {
    value: "Moto",
    label: "Moto",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765730/moto_xdypx2.png",
  },
  {
    value: "Citadine",
    label: "Citadine",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-ville_ocwbob.png",
  },
  {
    value: "Berline / Petit SUV",
    label: "Berline / Petit SUV",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/wagon-salon_bj2j1s.png",
  },
  {
    value: "Familiale / Grand SUV",
    label: "Familiale / Grand SUV",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-familiale_rmgclg.png",
  },
  {
    value: "Utilitaire",
    label: "Utilitaire",
    image:
      "https://res.cloudinary.com/dpcyppzpw/image/upload/v1740765729/voiture-de-livraison_nodnzh.png",
  },
];

const customOption = ({ data, innerRef, innerProps }) => (
  <div
    ref={innerRef}
    {...innerProps}
    className="flex items-center p-2 cursor-pointer hover:bg-gray-100"
  >
    <img src={data.image} alt={data.label} className="w-8 h-5 mr-3" />
    <span>{data.label}</span>
  </div>
);

const generatePassword = async () => {
  try {
    const response = await axios.get(
      "https://www.random.org/passwords/?num=1&len=16&format=plain&rnd=new"
    );

    if (response.status === 200) {
      return response.data.trim();
    } else {
      alert("Failed to generate password.");
      return "";
    }
  } catch (error) {
    console.error("Error generating password:", error);
    alert("An error occurred. Please try again later.");
    return "";
  }
};

const validatePassword = (password) => {
  const minLength = /.{8,}/;
  const hasUpperCase = /[A-Z]/;
  const hasLowerCase = /[a-z]/;
  const hasNumber = /[0-9]/;

  if (!minLength.test(password)) {
    return "Password must be at least 8 characters long.";
  }
  if (!hasUpperCase.test(password)) {
    return "Password must contain at least one uppercase letter.";
  }
  if (!hasLowerCase.test(password)) {
    return "Password must contain at least one lowercase letter.";
  }
  if (!hasNumber.test(password)) {
    return "Password must contain at least one number.";
  }

  return "";
};

const getUserProfile = async () => {
  try {
    const token = localStorage.getItem("token"); // Assure-toi que le token est stocké ici
    if (!token) throw new Error("No token found");

    const response = await fetch("http://localhost:3001/User/userProfile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error("Failed to fetch user");

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    return null;
  }
};

const updateUserProfile = async (userData, token, image, password) => {
  try {
    const formData = new FormData();
    if (image) formData.append("image", image);
    formData.append("name", userData.name);
    formData.append("email", userData.email);
    formData.append("phone", userData.phone);
    formData.append("role", userData.role);


    

    // Vérifier si vehicleType est défini avant de l'ajouter
    if (userData.vehicleType) {
      formData.append("vehicleType", userData.vehicleType);
    }

    if (password) formData.append("password", password);

    const response = await fetch("http://localhost:3001/User/profile", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) throw new Error("Failed to update user profile");

    const updatedUser = await response.json();
    return updatedUser;
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return null;
  }
};


const validatePhoneNumber = (phone) => {
  // Indian phone number: optional +91 or leading 0, then 10 digits starting with 6-9
  const phonePattern = /^(?:\+91[-\s]?|0)?[6-9]\d{9}$/;
  return phonePattern.test(phone);
};

const Profile = () => {
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState(null);
  const [user, setUser] = useState(null);
  const [image, setImage] = useState(null); // Pour gérer l'image
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "",
    vehicleType: "",
    password: "",
    confirmPassword: "",
  });
  const [phoneError, setPhoneError] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [quickRFIDCard, setQuickRFIDCard] = useState("");
  const [rfidError, setRfidError] = useState("");
  const [rfidSuccess, setRfidSuccess] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(
    user?.vehicleType
      ? vehicleOptions.find((option) => option.value === user.vehicleType) || null
      : null
  );
  

  useEffect(() => {
    const fetchUser = async () => {
      const data = await getUserProfile();
      if (data) {
        setUser(data);
        setUserData({
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          vehicleType: data.vehicleType,
          password: "",
          confirmPassword: "", // Initialiser le mot de passe vide pour le formulaire
        });
      }
    };

    fetchUser();
  }, []);

  const handleVehicleChange = (selectedOption) => {
    setSelectedVehicle(selectedOption);
    setUser((prevUser) => ({ ...prevUser, vehicleType: selectedOption.value }));
  };

  useEffect(() => {
    if (userData.password) {
      setPasswordError(validatePassword(userData.password));
    } else {
      setPasswordError("");
    }

    if (userData.confirmPassword) {
      if (userData.password !== userData.confirmPassword) {
        setConfirmPasswordError("Les mots de passe ne correspondent pas !");
      } else {
        setConfirmPasswordError("");
      }
    } else {
      setConfirmPasswordError("");
    }
  }, [userData.password, userData.confirmPassword]);

  const handleGeneratePassword = async () => {
    const newPassword = await generatePassword();
    if (newPassword) {
      setUserData({
        ...userData,
        password: newPassword,
        confirmPassword: newPassword,
      });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewImage(URL.createObjectURL(file)); // Affiche l'aperçu en temps réel
    }
  };
  useEffect(() => {
    if (user?.vehicleType) {
      const existingOption = vehicleOptions.find(
        (option) => option.value === user.vehicleType
      );
      setSelectedVehicle(existingOption || null);
    }
  }, [user]);

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleQuickRFIDRegister = async (e) => {
    e.preventDefault();
    setRfidError("");
    setRfidSuccess("");

    if (!quickRFIDCard.trim()) {
      setRfidError("Card ID is required");
      return;
    }

    if (quickRFIDCard.trim().length < 5) {
      setRfidError("Card ID must be at least 5 characters");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3001/User/rfid-cards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: quickRFIDCard.trim(),
          cardName: "My RFID Card",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRfidError(data.message || "Failed to register card");
        return;
      }

      setRfidSuccess("RFID card registered successfully!");
      setQuickRFIDCard("");

      setTimeout(() => {
        setRfidSuccess("");
        setRfidError("");
      }, 3000);
    } catch (err) {
      setRfidError(err.message || "Failed to register card");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let dataToSend = { ...user };

    if (user.role !== "Driver" && user.role !== "Vehicle_Owner") {
      delete dataToSend.vehicleType; // Ne pas envoyer vehicleType si ce n'est pas un Driver ou Vehicle_Owner
    }

    // Validation du téléphone avant l'envoi
    if (!validatePhoneNumber(userData.phone)) {
      setPhoneError("Phone number must be valid (ex: +91 9876543210).");
      return;
    }
    if (userData.password !== userData.confirmPassword) {
      alert("Les mots de passe ne correspondent pas !");
      return;
    }

    // Sinon, on peut continuer avec la mise à jour
    setPhoneError(""); // Effacer l'erreur si le numéro est valide

    const token = localStorage.getItem("token");
    const updatedUser = await updateUserProfile(
      userData,
      token,
      image,
      userData.password
    );

    if (updatedUser) {
      setUser(updatedUser.user);
      alert("Profile updated successfully!");
    }
  };

  const handleFileClick = () => {
    document.getElementById("file-input").click(); // Simuler un clic sur l'input file
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const renderOwnerDashboard = () => (
    <div className="mt-8 col-span-2">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Parking Space Management</h3>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-semibold mb-2">Active Parkings</h4>
          <a href="/my-parkings" className="text-blue-600 hover:underline">View All Parkings →</a>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-semibold mb-2">Reservations</h4>
          <a href="/OwnerReservations" className="text-blue-600 hover:underline">Manage Reservations →</a>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-semibold mb-2">Claims</h4>
          <a href="/OwnerClaims" className="text-blue-600 hover:underline">View Claims →</a>
        </div>
      </div>
    </div>
  );

  const renderDriverDashboard = () => (
    <div className="mt-8 col-span-2">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Your Parking Activity</h3>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-semibold mb-2">Active Subscriptions</h4>
          <a href="/my-subscriptions" className="text-blue-600 hover:underline">View Subscriptions →</a>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-semibold mb-2">Your Reservations</h4>
          <a href="/mes-reservations" className="text-blue-600 hover:underline">View Reservations →</a>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h4 className="font-semibold mb-2">Claims</h4>
          <a href="/UserClaims" className="text-blue-600 hover:underline">View Claims →</a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-10">
      <div className="w-full max-w-7xl grid grid-cols-3 gap-10">
        {/* Form */}
        <div className="col-span-2 bg-white shadow-lg rounded-lg p-10">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">
            My Account
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
            {[
              {
                label: "Name",
                type: "text",
                value: userData.name,
                key: "name",
              },
              {
                label: "Email",
                type: "email",
                value: userData.email,
                key: "email",
              },
              {
                label: "Phone Number",
                type: "text",
                value: userData.phone,
                key: "phone",
                error: phoneError,
              },
              {
                label: "Role",
                type: "text",
                value: userData.role,
                key: "role",
                readOnly: true,
              },
            ].map(({ label, type, value, key, error, readOnly }) => (
              <div key={key} className="flex flex-col">
                <label className="text-gray-700 font-medium mb-1">
                  {label}
                </label>
                <input
                  type={type}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 bg-white"
                  value={value}
                  onChange={(e) =>
                    setUserData({ ...userData, [key]: e.target.value })
                  }
                  readOnly={readOnly}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
            ))}
            {(user.role === "Driver" || user.role === "Vehicle_Owner") && (
              <div className="flex flex-col col-span-2">
                <label className="text-gray-700 font-medium mb-1">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <Select
                  options={vehicleOptions}
                  value={selectedVehicle}
                  onChange={handleVehicleChange}
                  components={{ Option: customOption }}
                  className="w-full"
                />
              </div>
            )}
            {[
              {
                label: "Password",
                key: "password",
                visible: passwordVisible,
                setVisible: setPasswordVisible,
                error: passwordError,
              },
              {
                label: "Confirm Password",
                key: "confirmPassword",
                visible: confirmPasswordVisible,
                setVisible: setConfirmPasswordVisible,
                error: confirmPasswordError,
              },
            ].map(({ label, key, visible, setVisible, error }) => (
              <div key={key} className="flex flex-col col-span-2">
                <label className="text-gray-700 font-medium mb-1 flex items-center">
                  {label} <span className="text-red-500 ml-1">*</span>
                  <span
                    className="ml-2 cursor-pointer"
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <FaEye size={20} /> : <FaEyeSlash size={20} />}
                  </span>
                </label>
                <div className="flex">
                  <input
                    type={visible ? "text" : "password"}
                    name={key}
                    className="w-full p-3 border rounded-lg"
                    value={userData[key]}
                    onChange={handleChange}
                    placeholder={label}
                  />
                  {key === "password" && (
                    <button
                      type="button"
                      className="ml-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 shadow-md"
                      onClick={handleGeneratePassword}
                    >
                      Generate
                    </button>
                  )}
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
            ))}
            
            {/* RFID Quick Register Section */}
            <div className="col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                🎫 Quick RFID Card Registration
              </h3>
              {rfidError && (
                <p className="text-red-500 text-sm mb-2">{rfidError}</p>
              )}
              {rfidSuccess && (
                <p className="text-green-500 text-sm mb-2">{rfidSuccess}</p>
              )}
              <form onSubmit={handleQuickRFIDRegister} className="flex gap-2">
                <input
                  type="text"
                  value={quickRFIDCard}
                  onChange={(e) => setQuickRFIDCard(e.target.value)}
                  placeholder="Scan RFID card or enter card ID..."
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-black rounded-lg hover:bg-blue-700 font-semibold whitespace-nowrap"
                >
                  Register Card
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/rfid-management")}
                  className="px-4 py-2 bg-purple-600 text-black rounded-lg hover:bg-purple-700 font-semibold whitespace-nowrap"
                >
                  Manage Cards
                </button>
              </form>
              <p className="text-xs text-blue-700 mt-2">
                Register your RFID card here or manage multiple cards in detail settings.
              </p>
            </div>

            <div className="flex justify-end col-span-2 mt-6">
              <button
                type="submit"
                className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 shadow-md"
              >
                Save Changes
              </button>
            </div>
          </form>
          
          {/* Role-specific Dashboard */}
          {user.role === 'Owner' && renderOwnerDashboard()}
          {(user.role === 'Driver' || user.role === 'Vehicle_Owner') && renderDriverDashboard()}
        </div>
        {/* Profile Card */}
        <div className="relative flex flex-col items-center bg-white shadow-lg rounded-lg p-6 w-80 h-96 self-start translate-x-16">
          <img
            src={
              previewImage ||
              user.image ||
              "https://res.cloudinary.com/dpcyppzpw/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1740761212/profile-user-icon_h3njnr.jpg"
            }
            alt="Profile"
            className="w-36 h-36 rounded-full border-4 border-white shadow-lg mb-4"
          />
          <h2 className="text-lg font-semibold text-gray-800">{user.name}</h2>
          <div className="text-sm text-gray-500 mb-4">{user.role}</div>
          <button
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-900 shadow-md"
            onClick={handleFileClick}
          >
            Upload Image
          </button>
          <button
            className="mt-3 px-4 py-2 bg-purple-600 text-black rounded-lg text-sm hover:bg-purple-700 shadow-md w-full"
            onClick={() => navigate('/rfid-management')}
          >
            🎫 RFID/FASTag Cards
          </button>
          <input
            id="file-input"
            type="file"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
      </div>
    </div>
  );
};

export default Profile;