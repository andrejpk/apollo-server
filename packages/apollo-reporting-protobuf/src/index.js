const protobuf = require('./protobuf');
const protobufJS = require('@apollo/protobufjs/minimal');

// Remove Long support.  Our uint64s tend to be small (less
// than 104 days).
// https://github.com/protobufjs/protobuf.js/issues/1253
protobufJS.util.Long = undefined;
protobufJS.configure();

// Override the generated protobuf Traces.encode function so that it will look
// for Traces that are already encoded to Buffer as well as unencoded
// Traces. This amortizes the protobuf encoding time over each generated Trace
// instead of bunching it all up at once at sendReport time. In load tests, this
// change improved p99 end-to-end HTTP response times by a factor of 11 without
// a casually noticeable effect on p50 times. This also makes it easier for us
// to implement maxUncompressedReportSize as we know the encoded size of traces
// as we go.
const originalTracesAndStatsEncode = protobuf.TracesAndStats.encode;
protobuf.TracesAndStats.encode = function(message, originalWriter) {
  const writer = originalTracesAndStatsEncode(message, originalWriter);
  const encodedTraces = message.encodedTraces;
  if (encodedTraces != null && encodedTraces.length) {
    for (let i = 0; i < encodedTraces.length; ++i) {
      writer.uint32(/* id 1, wireType 2 =*/ 10);
      writer.bytes(encodedTraces[i]);
    }
  }
  return writer;
};

module.exports = protobuf;
