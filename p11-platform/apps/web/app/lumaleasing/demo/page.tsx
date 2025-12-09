'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { LumaLeasingWidget } from '@/components/lumaleasing/LumaLeasingWidget';

function DemoContent() {
  const searchParams = useSearchParams();
  const apiKey = searchParams.get('apiKey');

  if (!apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-4">LumaLeasing Demo</h1>
          <p className="text-gray-600 mb-4">
            To test your widget, add your API key to the URL:
          </p>
          <code className="block p-3 bg-gray-100 rounded text-sm text-gray-800 break-all">
            /lumaleasing/demo?apiKey=YOUR_API_KEY
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Fake Property Website */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
            <span className="text-xl font-bold text-gray-900">Sunset Ridge Apartments</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#" className="text-gray-600 hover:text-gray-900">Floor Plans</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Amenities</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Gallery</a>
            <a href="#" className="text-gray-600 hover:text-gray-900">Contact</a>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Schedule Tour
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-12">
          <div className="h-96 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
            <div className="text-center text-white">
              <h1 className="text-4xl font-bold mb-4">Welcome Home</h1>
              <p className="text-xl opacity-90">Luxury living in the heart of the city</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">$1,450+</p>
                <p className="text-gray-500">Starting at</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">1-3</p>
                <p className="text-gray-500">Bedrooms</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">650-1,400</p>
                <p className="text-gray-500">Sq Ft</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          {[
            { title: 'Modern Finishes', desc: 'Quartz countertops, stainless appliances' },
            { title: 'Pet Friendly', desc: 'Dogs and cats welcome with deposit' },
            { title: 'In-Unit Laundry', desc: 'Washer & dryer in every home' },
            { title: 'Fitness Center', desc: '24/7 access to state-of-the-art gym' },
            { title: 'Pool & Spa', desc: 'Resort-style amenities' },
            { title: 'Covered Parking', desc: 'Included with every unit' },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-indigo-600 text-white rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Make This Your Home?</h2>
          <p className="text-indigo-100 mb-8 max-w-2xl mx-auto">
            Schedule a tour today and discover why residents love living at Sunset Ridge. 
            Our friendly team is ready to help you find your perfect floor plan.
          </p>
          <button className="px-8 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50">
            Schedule a Tour
          </button>
        </div>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="mb-4">123 Sunset Boulevard, Austin, TX 78701</p>
          <p className="text-sm">This is a demo page for testing the LumaLeasing widget.</p>
        </div>
      </footer>

      {/* LumaLeasing Widget */}
      <LumaLeasingWidget apiKey={apiKey} />
    </div>
  );
}

export default function LumaLeasingDemoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    }>
      <DemoContent />
    </Suspense>
  );
}

