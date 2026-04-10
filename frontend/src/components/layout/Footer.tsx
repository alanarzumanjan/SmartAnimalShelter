import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
	return (
		<footer className="bg-white border-t border-gray-200 mt-12">
			<div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
				<div className="flex items-center gap-2 text-gray-700">
					<span className="text-2xl">🐾</span>
					<span className="font-bold">Smart Shelter IoT</span>
				</div>
				<nav className="flex gap-6 text-gray-500 text-sm">
					<Link to="/" className="hover:text-primary-600">Home</Link>
					<Link to="/animals" className="hover:text-primary-600">Animals</Link>
					<Link to="/store" className="hover:text-primary-600">Store</Link>
					<Link to="/dashboard/chats" className="hover:text-primary-600">Chats</Link>
					<a href="https://github.com/alanarzumanjan/SmartAnimalShelter" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600">GitHub</a>
				</nav>
				<div className="text-gray-400 text-xs text-center md:text-right">
					&copy; {new Date().getFullYear()} Smart Shelter IoT. MIT License.<br/>
					<span className="text-gray-300">by Alans Arzumanjans</span>
				</div>
			</div>
		</footer>
	);
};

export default Footer;
