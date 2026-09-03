
const About = () => {
    return (
            <div className="text-center py-1.5 px-1.5 mt-6 mb-6">
  <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 text-left">
    
    {/* Header */}
    <div className="text-center max-w-2xl mx-auto mb-12">
      <span className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        Who We Are
      </span>
      <h2 className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
        Building tools to empower your digital journey
      </h2>
      <p className="mt-3 text-base text-gray-500 dark:text-gray-400">
        We are a passionate team dedicated to crafting intuitive, reliable, and modern web experiences for developers and users worldwide.
      </p>
    </div>

    {/* Hero Card / Story Section */}
    <div className="bg-green-200  text-gray-900 p-8 rounded-xl mb-12 shadow-sm">
      <div className="max-w-3xl">
        <h3 className="text-2xl font-bold mb-3 text-gray-900">Our Story</h3>
        <p className="text-gray-900 text-sm leading-relaxed mb-4">
          Founded in 2024, our mission started with a simple belief: web software should be fast, accessible, and delight to use. What began as a small weekend project has grown into a suite of tools serving thousands of users daily.
        </p>
        <p className="text-gray-900 text-sm leading-relaxed">
          We pride ourselves on clean design, transparent communication, and relentless iteration based on real user feedback.
        </p>
      </div>
    </div>

    {/* Values Grid */}
    <div className="mb-12">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
        Our Core Values
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Value 1 */}
        <div className="p-5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Fast & Reliable</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Performance isn't an afterthought—it's built into every line of code we write and feature we release.
          </p>
        </div>

        {/* Value 2 */}
        <div className="p-5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">User First</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Every design decision starts with a user need. We listen closely and build solutions that matter.
          </p>
        </div>

        {/* Value 3 */}
        <div className="p-5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Privacy Focused</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            We respect your data. Security and privacy practices are embedded directly into our product architecture.
          </p>
        </div>

      </div>
    </div>

    {/* Key Stats Banner */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
      <div>
        <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">10K+</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Active Users</p>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">99.9%</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Uptime Guarantee</p>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">24/7</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Community Support</p>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">15+</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Global Team Members</p>
      </div>
    </div>

  </div>
</div>
    );
};

export default About;