import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, X, Camera } from 'lucide-react';

const CreateTicket = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // compute default local datetime for datetime-local input
  const getDefaultIssueDate = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now - offsetMs).toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  };

  const defaultIssueDate = getDefaultIssueDate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm({
    defaultValues: {
      department: '',
      equipment_type: '',
      problem_description: '',
      issue_date: defaultIssueDate
    }
  });
  
  // load current user and preset department for non-admins
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('/api/auth/me'); // adjust if your endpoint differs
        const user = res.data;
        setCurrentUser(user);
        setIsAdmin(user?.role === 'Admin');
        if (user && user.role !== 'Admin' && user.department) {
          setValue('department', user.department);
        }
      } catch (err) {
        console.error('Failed to load current user', err);
      }
    };
    fetchUser();
  }, [setValue]);

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const onSubmit = async (data) => {
    console.log('CreateTicket onSubmit data:', data); // debug: check equipment_type
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('department', data.department);
      formData.append('equipment_type', data.equipment_type);
      formData.append('problem_description', data.problem_description);
      formData.append('issue_date', data.issue_date);
      
      if (photo) {
        formData.append('photo', photo);
      }

      await axios.post('/api/tickets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Ticket created successfully!');
      reset();
      setPhoto(null);
      setPhotoPreview(null);
      navigate('/tickets');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to create ticket';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Ticket</h1>
        <p className="text-gray-600">Report a new IT issue or problem</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <div className="space-y-4">
            {/* Department */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                Department Name *
              </label>
              {/* <input
                type="text"
                id="department"
                {...register('department', { required: 'Department is required' })}
                className="input mt-1"
                placeholder="e.g., Marketing, Sales, IT"
              /> */}
              {/* if user is not admin show a single disabled option with user's department */}
              {!isAdmin && currentUser ? (
                <select
                  {...register('department', { required: 'Department is required' })}
                  className="input mt-1"
                  disabled
                >
                  <option value={currentUser.department}>{currentUser.department}</option>
                </select>
              ) : (
                <select
                  {...register('department', { required: 'Department is required' })}
                  className="input mt-1"
                >
                  <option value="" disabled>Select a Department</option>
                  <option value="OSDS">OSDS</option>
                  <option value="SGOD">SGOD</option>
                  <option value="CID">CID</option>
                </select>
              )}
              
              {errors.department && (
                <p className="mt-1 text-sm text-danger-600">{errors.department.message}</p>
              )}
            </div>

            {/* Equipment Type */}
            <div>
              <label htmlFor="equipment_type" className="block text-sm font-medium text-gray-700">
                Equipment Type *
              </label>
              <select
                id="equipment_type"
                {...register('equipment_type', { required: 'Equipment type is required' })}
                className="input mt-1"
              >
                <option value="">Select equipment type</option>
                <option value="PC">PC</option>
                <option value="Laptop">Laptop</option>
                <option value="Printer">Printer</option>
                <option value="Internet">Internet</option>
                <option value="Other">Other</option>
              </select>
              {errors.equipment_type && (
                <p className="mt-1 text-sm text-danger-600">{errors.equipment_type.message}</p>
              )}
            </div>

            {/* Problem Description */}
            <div>
              <label htmlFor="problem_description" className="block text-sm font-medium text-gray-700">
                Problem Description *
              </label>
              <textarea
                id="problem_description"
                rows={4}
                {...register('problem_description', { 
                  required: 'Problem description is required',
                  minLength: {
                    value: 10,
                    message: 'Description must be at least 10 characters'
                  }
                })}
                className="input mt-1"
                placeholder="Describe the issue in detail..."
              />
              {errors.problem_description && (
                <p className="mt-1 text-sm text-danger-600">{errors.problem_description.message}</p>
              )}
            </div>

            {/* Issue Date */}
            <div>
              <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700">
                Date and Time of Issue *
              </label>
              <input
                type="datetime-local"
                id="issue_date"
                {...register('issue_date', { required: 'Issue date is required' })}
                className="input mt-1"
              />
              {errors.issue_date && (
                <p className="mt-1 text-sm text-danger-600">{errors.issue_date.message}</p>
              )}
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Photo (Optional)
              </label>
              
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-2 right-2 p-1 bg-danger-600 text-white rounded-full hover:bg-danger-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    {isDragActive
                      ? 'Drop the photo here...'
                      : 'Drag & drop a photo here, or click to select'}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/tickets')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </div>
            ) : (
              'Create Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTicket;