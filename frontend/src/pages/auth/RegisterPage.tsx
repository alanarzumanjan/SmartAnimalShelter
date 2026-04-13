import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock, User, UserPlus, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

type UserRole = 'user' | 'veterinarian' | 'shelter';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user' as UserRole,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateBasic = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    if (formData.password !== formData.confirmPassword) 
      newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateBasic()) return;
    
    setIsLoading(true);
    setErrors({}); 
    
    try {
      const response = await api.post('/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Registration successful!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.response?.status === 400) {
        const backendErrors = error.response.data.errors;
        if (backendErrors) {
          const mappedErrors: { [key: string]: string } = {};
          if (backendErrors.email) mappedErrors.email = backendErrors.email;
          if (backendErrors.password) mappedErrors.password = backendErrors.password;
          if (backendErrors.username) mappedErrors.name = backendErrors.username;
          setErrors(mappedErrors);
          toast.error('Please fix the validation errors');
        } else {
          const message = error.response.data.message || error.response.data;
          toast.error(message);
        }
      } else if (error.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🐾</div>
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">Join Smart Shelter IoT</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            icon={<User className="w-5 h-5" />}
            value={formData.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
          />

          <Input
            label="Email"
            type="email"
            placeholder="your@email.com"
            icon={<Mail className="w-5 h-5" />}
            value={formData.email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-5 h-5" />}
            value={formData.password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="w-5 h-5" />}
            value={formData.confirmPassword}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, confirmPassword: e.target.value })}
            error={errors.confirmPassword}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={formData.role}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-gray-900 appearance-none cursor-pointer"
              >
                <option value="user">🐾 User - Browse and adopt pets</option>
                <option value="veterinarian">🩺 Veterinarian - Manage animal health records</option>
                <option value="shelter">🏠 Shelter - Manage shelter and publish animal profiles</option>
              </select>
            </div>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
          </div>

          <Button type="submit" fullWidth isLoading={isLoading}>
            <UserPlus className="w-5 h-5" />
            Sign Up
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;