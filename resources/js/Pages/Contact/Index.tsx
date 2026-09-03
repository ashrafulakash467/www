
const Contact = () => {
    return (
        <div className="text-center py-1.5 px-1.5 mt-6 mb-6">
            <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 text-left">
    
    {/* Header */}
    

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      
      {/* Contact Information Sidebar */}
      <div className="md:col-span-1 bg-indigo-600 dark:bg-indigo-700 text-white p-6 rounded-xl flex flex-col justify-between space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-white">Contact Info</h3>
          <p className="text-indigo-100 text-sm mb-6">
            Feel free to reach out to us during business hours.
          </p>
          
          <div className="space-y-4 text-sm">
            {/* Phone */}
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-indigo-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>+1 (555) 000-0000</span>
            </div>
            
            {/* Email */}
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-indigo-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>hello@example.com</span>
            </div>

            {/* Address */}
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-indigo-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>123 Innovation Way, Suite 100, San Francisco, CA</span>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="pt-6 border-t border-indigo-500/50 text-xs text-indigo-100">
          <p className="font-semibold text-white mb-1">Hours:</p>
          <p>Mon - Fri: 9:00 AM - 6:00 PM</p>
          <p>Sat - Sun: Closed</p>
        </div>
      </div>

      {/* Form Section */}
      <form className="md:col-span-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First Name */}
          <div>
            <label htmlFor="first-name" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              First Name
            </label>
            <input
              type="text"
              id="first-name"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
              placeholder="Jane"
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="last-name" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="last-name"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
              placeholder="Doe"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
            placeholder="jane@example.com"
          />
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
            Subject
          </label>
          <input
            type="text"
            id="subject"
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white text-sm"
            placeholder="How can we help?"
          />
        </div>

        {/* Message */}
        <div>
          <label htmlFor="message" className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
            Message
          </label>
          <textarea
            id="message"
            rows={4}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white text-sm resize-none"
            placeholder="Write your message here..."
          ></textarea>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm"
        >
          Send Message
        </button>
      </form>

    </div>
            </div>
        </div>
    );
};

export default Contact;