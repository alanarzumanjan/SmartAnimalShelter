import React from 'react';
import { User, Mail, Phone, MapPin, Shield, Edit2, Save, X } from 'lucide-react';
import { UserProfile, getRoleBadge } from './types';

interface EditForm {
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Props {
  profile: UserProfile;
  isEditing: boolean;
  editForm: EditForm;
  onEditToggle: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFormChange: (field: keyof EditForm, value: string) => void;
}

const inputClass = 'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const readonlyClass = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white';
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2';

export default function ProfileTab({ profile, isEditing, editForm, onEditToggle, onCancel, onSave, onFormChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>

        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={onEditToggle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>
            <User className="w-4 h-4 inline mr-1" />
            Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => onFormChange('name', e.target.value)}
              className={inputClass}
            />
          ) : (
            <div className={readonlyClass}>{profile.username}</div>
          )}
        </div>

        <div>
          <label className={labelClass}>
            <Mail className="w-4 h-4 inline mr-1" />
            Email
          </label>
          {isEditing ? (
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => onFormChange('email', e.target.value)}
              className={inputClass}
            />
          ) : (
            <div className={readonlyClass}>{profile.email}</div>
          )}
        </div>

        <div>
          <label className={labelClass}>
            <Phone className="w-4 h-4 inline mr-1" />
            Phone
          </label>
          {isEditing ? (
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => onFormChange('phone', e.target.value)}
              placeholder="+371 ..."
              className={inputClass}
            />
          ) : (
            <div className={readonlyClass}>{profile.phone || 'Not set'}</div>
          )}
        </div>

        <div>
          <label className={labelClass}>
            <MapPin className="w-4 h-4 inline mr-1" />
            Address
          </label>
          {isEditing ? (
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => onFormChange('address', e.target.value)}
              placeholder="Your address"
              className={inputClass}
            />
          ) : (
            <div className={readonlyClass}>{profile.address || 'Not set'}</div>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          <Shield className="w-4 h-4 inline mr-1" />
          Role
        </label>
        <div className={readonlyClass}>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getRoleBadge(profile.role)}`}>
            {profile.role}
          </span>
        </div>
      </div>
    </div>
  );
}
